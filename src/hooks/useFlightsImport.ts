import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface FlightRecord {
  flight_date: string;
  from_airport: string;
  to_airport: string;
  from_country_iso2?: string;
  to_country_iso2?: string;
  airline?: string;
  flight_number?: string;
}

export interface ParsedFlight extends FlightRecord {
  id: string; // temporary ID for preview
  isValid: boolean;
  errors: string[];
}

export function useImportFlights() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      flights, 
      autoCreateVisits 
    }: { 
      flights: FlightRecord[]; 
      autoCreateVisits: boolean;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Insert flights
      const flightsToInsert = flights.map(flight => ({
        user_id: user.id,
        flight_date: flight.flight_date,
        from_airport: flight.from_airport,
        to_airport: flight.to_airport,
        from_country_iso2: flight.from_country_iso2 || null,
        to_country_iso2: flight.to_country_iso2 || null,
        airline: flight.airline || null,
        flight_number: flight.flight_number || null,
        source: 'csv_import',
      }));

      const { data: insertedFlights, error: flightsError } = await supabase
        .from('flights')
        .insert(flightsToInsert)
        .select();

      if (flightsError) throw flightsError;

      // Auto-create visits for destination countries if enabled
      if (autoCreateVisits && insertedFlights) {
        const uniqueDestinations = new Map<string, { iso: string; date: string }>();
        
        for (const flight of flights) {
          if (flight.to_country_iso2) {
            const key = `${flight.to_country_iso2}-${flight.flight_date}`;
            if (!uniqueDestinations.has(key)) {
              uniqueDestinations.set(key, {
                iso: flight.to_country_iso2,
                date: flight.flight_date,
              });
            }
          }
        }

        // Check which visits already exist
        const destinationIsos = [...new Set([...uniqueDestinations.values()].map(d => d.iso))];
        
        const { data: existingVisits } = await supabase
          .from('visits')
          .select('country_iso2, arrival_date')
          .eq('user_id', user.id)
          .in('country_iso2', destinationIsos);

        const existingVisitKeys = new Set(
          (existingVisits || []).map(v => `${v.country_iso2}-${v.arrival_date}`)
        );

        // Create visits for destinations that don't exist
        const visitsToCreate = [...uniqueDestinations.values()]
          .filter(dest => !existingVisitKeys.has(`${dest.iso}-${dest.date}`))
          .map(dest => ({
            user_id: user.id,
            country_iso2: dest.iso,
            arrival_date: dest.date,
            source: 'flight',
          }));

        if (visitsToCreate.length > 0) {
          const { error: visitsError } = await supabase
            .from('visits')
            .insert(visitsToCreate);

          if (visitsError) {
            console.error('Error creating visits:', visitsError);
            // Don't throw - flights were still imported successfully
          }
        }

        return {
          flightsImported: insertedFlights.length,
          visitsCreated: visitsToCreate.length,
        };
      }

      return {
        flightsImported: insertedFlights.length,
        visitsCreated: 0,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      
      let description = `Successfully imported ${result.flightsImported} flights.`;
      if (result.visitsCreated > 0) {
        description += ` Created ${result.visitsCreated} new country visits.`;
      }
      
      toast({ 
        title: 'Import complete', 
        description,
      });
    },
    onError: (error) => {
      toast({ 
        title: 'Import failed', 
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// CSV parsing utilities
export function parseFlightsCSV(csvText: string): { flights: ParsedFlight[]; errors: string[] } {
  const lines = csvText.trim().split('\n');
  const errors: string[] = [];
  const flights: ParsedFlight[] = [];

  if (lines.length < 2) {
    errors.push('CSV file must have a header row and at least one data row');
    return { flights, errors };
  }

  // Parse header to find column indices
  const header = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
  
  const columnMappings: Record<string, string[]> = {
    flight_date: ['date', 'flight_date', 'departure_date', 'dep_date', 'flightdate'],
    from_airport: ['from', 'from_airport', 'departure', 'dep', 'origin', 'from_iata', 'departure_airport'],
    to_airport: ['to', 'to_airport', 'arrival', 'arr', 'destination', 'to_iata', 'arrival_airport'],
    from_country_iso2: ['from_country', 'from_country_iso2', 'origin_country', 'dep_country'],
    to_country_iso2: ['to_country', 'to_country_iso2', 'destination_country', 'arr_country'],
    airline: ['airline', 'carrier', 'airline_name'],
    flight_number: ['flight_number', 'flight_no', 'flight', 'flightnumber'],
  };

  const columnIndices: Record<string, number> = {};
  
  for (const [field, aliases] of Object.entries(columnMappings)) {
    for (const alias of aliases) {
      const index = header.indexOf(alias);
      if (index !== -1) {
        columnIndices[field] = index;
        break;
      }
    }
  }

  // Validate required columns
  if (columnIndices.flight_date === undefined) {
    errors.push('Missing required column: date (try: date, flight_date, departure_date)');
  }
  if (columnIndices.from_airport === undefined) {
    errors.push('Missing required column: from_airport (try: from, origin, departure)');
  }
  if (columnIndices.to_airport === undefined) {
    errors.push('Missing required column: to_airport (try: to, destination, arrival)');
  }

  if (errors.length > 0) {
    return { flights, errors };
  }

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    const rowErrors: string[] = [];
    
    const flightDate = values[columnIndices.flight_date]?.trim() || '';
    const fromAirport = values[columnIndices.from_airport]?.trim() || '';
    const toAirport = values[columnIndices.to_airport]?.trim() || '';

    // Validate required fields
    if (!flightDate) rowErrors.push('Missing date');
    if (!fromAirport) rowErrors.push('Missing from airport');
    if (!toAirport) rowErrors.push('Missing to airport');

    // Validate date format
    let parsedDate = '';
    if (flightDate) {
      const date = parseDate(flightDate);
      if (date) {
        parsedDate = date.toISOString().split('T')[0];
      } else {
        rowErrors.push('Invalid date format');
      }
    }

    const flight: ParsedFlight = {
      id: `row-${i}`,
      flight_date: parsedDate,
      from_airport: fromAirport.toUpperCase(),
      to_airport: toAirport.toUpperCase(),
      from_country_iso2: columnIndices.from_country_iso2 !== undefined 
        ? values[columnIndices.from_country_iso2]?.trim().toUpperCase() || undefined
        : undefined,
      to_country_iso2: columnIndices.to_country_iso2 !== undefined 
        ? values[columnIndices.to_country_iso2]?.trim().toUpperCase() || undefined
        : undefined,
      airline: columnIndices.airline !== undefined 
        ? values[columnIndices.airline]?.trim() || undefined
        : undefined,
      flight_number: columnIndices.flight_number !== undefined 
        ? values[columnIndices.flight_number]?.trim().toUpperCase() || undefined
        : undefined,
      isValid: rowErrors.length === 0,
      errors: rowErrors,
    };

    flights.push(flight);
  }

  return { flights, errors };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

function parseDate(dateStr: string): Date | null {
  // Try various date formats
  const formats = [
    // ISO format
    /^(\d{4})-(\d{2})-(\d{2})$/,
    // US format
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // EU format
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/,
    // Other common formats
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
  ];

  // Try ISO format first
  const isoMatch = dateStr.match(formats[0]);
  if (isoMatch) {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) return date;
  }

  // Try US format (MM/DD/YYYY)
  const usMatch = dateStr.match(formats[1]);
  if (usMatch) {
    const [, month, day, year] = usMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) return date;
  }

  // Try EU format (DD.MM.YYYY)
  const euMatch = dateStr.match(formats[2]);
  if (euMatch) {
    const [, day, month, year] = euMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) return date;
  }

  // Try DD-MM-YYYY
  const dashMatch = dateStr.match(formats[3]);
  if (dashMatch) {
    const [, day, month, year] = dashMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) return date;
  }

  // Last resort: let JavaScript try
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) return date;

  return null;
}
