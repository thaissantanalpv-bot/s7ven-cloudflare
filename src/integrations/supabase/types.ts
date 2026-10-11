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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admin_invites: {
        Row: {
          email: string
        }
        Insert: {
          email: string
        }
        Update: {
          email?: string
        }
        Relationships: []
      }
      catalog_products: {
        Row: {
          data: Json
          id: string
          updated_at: string
        }
        Insert: {
          data: Json
          id: string
          updated_at?: string
        }
        Update: {
          data?: Json
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      catalog_sessions: {
        Row: {
          cart_started_at: string | null
          checkout_at: string | null
          id: string
          last_seen_at: string
          rate_key: string
          started_at: string
          visitor_id: string
        }
        Insert: {
          cart_started_at?: string | null
          checkout_at?: string | null
          id: string
          last_seen_at?: string
          rate_key: string
          started_at?: string
          visitor_id: string
        }
        Update: {
          cart_started_at?: string | null
          checkout_at?: string | null
          id?: string
          last_seen_at?: string
          rate_key?: string
          started_at?: string
          visitor_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          address: string
          analytics_session_id: string | null
          analytics_visitor_id: string | null
          cash_change: number | null
          cash_received: number | null
          cashier_id: string | null
          change_for: string
          created_at: string
          customer_name: string
          customer_phone: string
          delivery_confirmed: boolean
          delivery_fee: number
          delivery_zone: string
          fulfillment: string
          id: string
          items: Json
          notes: string
          number: number
          payment: string
          request_id: string
          source: string
          status: string
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          address: string
          analytics_session_id?: string | null
          analytics_visitor_id?: string | null
          cash_change?: number | null
          cash_received?: number | null
          cashier_id?: string | null
          change_for?: string
          created_at?: string
          customer_name: string
          customer_phone: string
          delivery_confirmed?: boolean
          delivery_fee?: number
          delivery_zone?: string
          fulfillment?: string
          id?: string
          items: Json
          notes?: string
          number?: never
          payment: string
          request_id: string
          source?: string
          status?: string
          subtotal: number
          total: number
          updated_at?: string
        }
        Update: {
          address?: string
          analytics_session_id?: string | null
          analytics_visitor_id?: string | null
          cash_change?: number | null
          cash_received?: number | null
          cashier_id?: string | null
          change_for?: string
          created_at?: string
          customer_name?: string
          customer_phone?: string
          delivery_confirmed?: boolean
          delivery_fee?: number
          delivery_zone?: string
          fulfillment?: string
          id?: string
          items?: Json
          notes?: string
          number?: never
          payment?: string
          request_id?: string
          source?: string
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          delivery_enabled: boolean
          delivery_zones: Json
          fixed_delivery_fee: number | null
          hours_enabled: boolean
          id: string
          opening_hours: Json
          pickup_address: string
          updated_at: string
        }
        Insert: {
          delivery_enabled?: boolean
          delivery_zones?: Json
          fixed_delivery_fee?: number | null
          hours_enabled?: boolean
          id?: string
          opening_hours?: Json
          pickup_address?: string
          updated_at?: string
        }
        Update: {
          delivery_enabled?: boolean
          delivery_zones?: Json
          fixed_delivery_fee?: number | null
          hours_enabled?: boolean
          id?: string
          opening_hours?: Json
          pickup_address?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      catalog_funnel_stats: { Args: { _period?: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_catalog_photo: { Args: { _path: string }; Returns: boolean }
      list_catalog_sales: {
        Args: { _offset?: number }
        Returns: {
          data: Json
          id: string
          updated_at: string
        }[]
      }
      track_catalog_session: {
        Args: {
          _cart: boolean
          _id: string
          _rate_key: string
          _visitor: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin"],
    },
  },
} as const
