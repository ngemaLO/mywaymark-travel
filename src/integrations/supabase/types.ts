export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      chapter_trips: {
        Row: {
          added_method: Database["public"]["Enums"]["chapter_trip_method"]
          chapter_id: string
          created_at: string
          id: string
          trip_id: string
          user_id: string
        }
        Insert: {
          added_method?: Database["public"]["Enums"]["chapter_trip_method"]
          chapter_id: string
          created_at?: string
          id?: string
          trip_id: string
          user_id: string
        }
        Update: {
          added_method?: Database["public"]["Enums"]["chapter_trip_method"]
          chapter_id?: string
          created_at?: string
          id?: string
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapter_trips_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapter_trips_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      chapters: {
        Row: {
          cover_style: string | null
          created_at: string
          description: string | null
          end_date: string | null
          home_base_country_iso2: string | null
          id: string
          is_private: boolean
          start_date: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_style?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          home_base_country_iso2?: string | null
          id?: string
          is_private?: boolean
          start_date: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_style?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          home_base_country_iso2?: string | null
          id?: string
          is_private?: boolean
          start_date?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapters_home_base_country_iso2_fkey"
            columns: ["home_base_country_iso2"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["iso2"]
          },
        ]
      }
      countries: {
        Row: {
          continent: string
          flag_primary_color: string | null
          iso2: string
          name: string
          silhouette_asset_url: string | null
        }
        Insert: {
          continent: string
          flag_primary_color?: string | null
          iso2: string
          name: string
          silhouette_asset_url?: string | null
        }
        Update: {
          continent?: string
          flag_primary_color?: string | null
          iso2?: string
          name?: string
          silhouette_asset_url?: string | null
        }
        Relationships: []
      }
      country_images: {
        Row: {
          country_iso2: string
          created_at: string | null
          id: string
          image_url: string
          thumb_url: string | null
          user_id: string
        }
        Insert: {
          country_iso2: string
          created_at?: string | null
          id?: string
          image_url: string
          thumb_url?: string | null
          user_id: string
        }
        Update: {
          country_iso2?: string
          created_at?: string | null
          id?: string
          image_url?: string
          thumb_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "country_images_country_iso2_fkey"
            columns: ["country_iso2"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["iso2"]
          },
        ]
      }
      country_notes: {
        Row: {
          country_iso2: string
          id: string
          note: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          country_iso2: string
          id?: string
          note?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          country_iso2?: string
          id?: string
          note?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "country_notes_country_iso2_fkey"
            columns: ["country_iso2"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["iso2"]
          },
        ]
      }
      flights: {
        Row: {
          airline: string | null
          created_at: string | null
          flight_date: string
          flight_number: string | null
          from_airport: string
          from_country_iso2: string | null
          id: string
          source: string
          to_airport: string
          to_country_iso2: string | null
          user_id: string
        }
        Insert: {
          airline?: string | null
          created_at?: string | null
          flight_date: string
          flight_number?: string | null
          from_airport: string
          from_country_iso2?: string | null
          id?: string
          source: string
          to_airport: string
          to_country_iso2?: string | null
          user_id: string
        }
        Update: {
          airline?: string | null
          created_at?: string | null
          flight_date?: string
          flight_number?: string | null
          from_airport?: string
          from_country_iso2?: string | null
          id?: string
          source?: string
          to_airport?: string
          to_country_iso2?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flights_from_country_iso2_fkey"
            columns: ["from_country_iso2"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["iso2"]
          },
          {
            foreignKeyName: "flights_to_country_iso2_fkey"
            columns: ["to_country_iso2"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["iso2"]
          },
        ]
      }
      home_bases: {
        Row: {
          country_iso2: string
          created_at: string | null
          end_date: string | null
          id: string
          start_date: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          country_iso2: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          start_date: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          country_iso2?: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          start_date?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      places: {
        Row: {
          country_iso2: string
          created_at: string | null
          created_by: string | null
          external_place_id: string | null
          id: string
          lat: number | null
          lng: number | null
          name: string
          type: string
        }
        Insert: {
          country_iso2: string
          created_at?: string | null
          created_by?: string | null
          external_place_id?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          type: string
        }
        Update: {
          country_iso2?: string
          created_at?: string | null
          created_by?: string | null
          external_place_id?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "places_country_iso2_fkey"
            columns: ["country_iso2"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["iso2"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string
          privacy_no_background_tracking: boolean | null
          theme: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          privacy_no_background_tracking?: boolean | null
          theme?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          privacy_no_background_tracking?: boolean | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      share_links: {
        Row: {
          active: boolean | null
          created_at: string | null
          detail_level: string | null
          expires_at: string | null
          id: string
          scope_badges: boolean | null
          scope_images: boolean | null
          scope_map: boolean | null
          scope_notes: boolean | null
          scope_stats: boolean | null
          scope_timeline: boolean | null
          token: string
          user_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          detail_level?: string | null
          expires_at?: string | null
          id?: string
          scope_badges?: boolean | null
          scope_images?: boolean | null
          scope_map?: boolean | null
          scope_notes?: boolean | null
          scope_stats?: boolean | null
          scope_timeline?: boolean | null
          token: string
          user_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          detail_level?: string | null
          expires_at?: string | null
          id?: string
          scope_badges?: boolean | null
          scope_images?: boolean | null
          scope_map?: boolean | null
          scope_notes?: boolean | null
          scope_stats?: boolean | null
          scope_timeline?: boolean | null
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      trip_connection_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string | null
          id: string
          token: string
          trip_id: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          token: string
          trip_id: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          token?: string
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_connection_codes_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_connections: {
        Row: {
          created_at: string
          id: string
          initiated_by: string
          status: string
          trip_id: string
          updated_at: string
          user_a_confirmed: boolean
          user_a_id: string
          user_b_confirmed: boolean
          user_b_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          initiated_by: string
          status?: string
          trip_id: string
          updated_at?: string
          user_a_confirmed?: boolean
          user_a_id: string
          user_b_confirmed?: boolean
          user_b_id: string
        }
        Update: {
          created_at?: string
          id?: string
          initiated_by?: string
          status?: string
          trip_id?: string
          updated_at?: string
          user_a_confirmed?: boolean
          user_a_id?: string
          user_b_confirmed?: boolean
          user_b_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_connections_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_messages: {
        Row: {
          connection_id: string
          content: string
          created_at: string
          id: string
          sender_user_id: string
          trip_id: string
        }
        Insert: {
          connection_id: string
          content: string
          created_at?: string
          id?: string
          sender_user_id: string
          trip_id: string
        }
        Update: {
          connection_id?: string
          content?: string
          created_at?: string
          id?: string
          sender_user_id?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_messages_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "trip_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_messages_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_summaries: {
        Row: {
          created_at: string
          error_message: string | null
          generated_at: string
          highlights: Json
          id: string
          model: string | null
          period_end: string | null
          period_start: string
          source_context: Json
          stats_snapshot: Json
          status: string
          summary: string
          title: string
          trip_id: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          generated_at?: string
          highlights?: Json
          id?: string
          model?: string | null
          period_end?: string | null
          period_start: string
          source_context?: Json
          stats_snapshot?: Json
          status?: string
          summary: string
          title: string
          trip_id: string
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          created_at?: string
          error_message?: string | null
          generated_at?: string
          highlights?: Json
          id?: string
          model?: string | null
          period_end?: string | null
          period_start?: string
          source_context?: Json
          stats_snapshot?: Json
          status?: string
          summary?: string
          title?: string
          trip_id?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "trip_summaries_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: true
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          created_at: string | null
          end_date: string | null
          id: string
          inferred: boolean | null
          is_travel: boolean
          source: string
          start_date: string
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          inferred?: boolean | null
          is_travel?: boolean
          source: string
          start_date: string
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          inferred?: boolean | null
          is_travel?: boolean
          source?: string
          start_date?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_places: {
        Row: {
          created_at: string | null
          id: string
          place_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          place_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          place_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_places_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
      visits: {
        Row: {
          arrival_date: string
          country_iso2: string
          created_at: string | null
          departure_date: string | null
          id: string
          place_id: string | null
          source: string
          source_confidence: string | null
          trip_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          arrival_date: string
          country_iso2: string
          created_at?: string | null
          departure_date?: string | null
          id?: string
          place_id?: string | null
          source: string
          source_confidence?: string | null
          trip_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          arrival_date?: string
          country_iso2?: string
          created_at?: string | null
          departure_date?: string | null
          id?: string
          place_id?: string | null
          source?: string
          source_confidence?: string | null
          trip_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visits_country_iso2_fkey"
            columns: ["country_iso2"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["iso2"]
          },
          {
            foreignKeyName: "visits_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      waymark_letters: {
        Row: {
          body: string
          chapter_id: string | null
          created_at: string
          error_message: string | null
          generated_at: string
          id: string
          period_end: string
          period_start: string
          scope: Database["public"]["Enums"]["letter_scope"]
          stats_snapshot: Json
          status: Database["public"]["Enums"]["letter_status"]
          subtitle: string | null
          supporting_signals: Json
          theme: string
          title: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          body: string
          chapter_id?: string | null
          created_at?: string
          error_message?: string | null
          generated_at?: string
          id?: string
          period_end: string
          period_start: string
          scope: Database["public"]["Enums"]["letter_scope"]
          stats_snapshot?: Json
          status?: Database["public"]["Enums"]["letter_status"]
          subtitle?: string | null
          supporting_signals?: Json
          theme: string
          title: string
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          body?: string
          chapter_id?: string | null
          created_at?: string
          error_message?: string | null
          generated_at?: string
          id?: string
          period_end?: string
          period_start?: string
          scope?: Database["public"]["Enums"]["letter_scope"]
          stats_snapshot?: Json
          status?: Database["public"]["Enums"]["letter_status"]
          subtitle?: string | null
          supporting_signals?: Json
          theme?: string
          title?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "waymark_letters_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      chapter_trip_method: "auto" | "manual"
      letter_scope: "year" | "chapter" | "custom" | "trip"
      letter_status: "ready" | "failed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      chapter_trip_method: ["auto", "manual"],
      letter_scope: ["year", "chapter", "custom", "trip"],
      letter_status: ["ready", "failed"],
    },
  },
} as const
