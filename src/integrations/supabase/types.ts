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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      captured_leads: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          listing_id: string | null
          password_attempt: string
          phone: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          listing_id?: string | null
          password_attempt: string
          phone?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          listing_id?: string | null
          password_attempt?: string
          phone?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "captured_leads_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          read_at: string | null
          sender: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          listing_id: string | null
          visitor_id: string
          visitor_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          listing_id?: string | null
          visitor_id: string
          visitor_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          listing_id?: string | null
          visitor_id?: string
          visitor_name?: string | null
        }
        Relationships: []
      }
      listing_images: {
        Row: {
          created_at: string
          display_order: number
          id: string
          listing_id: string
          url: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          listing_id: string
          url: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          listing_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_images_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          brand: string | null
          carousel_section: string
          category: string | null
          color: string | null
          condition: string | null
          created_at: string
          description: string | null
          display_order: number
          id: string
          installment_label: string | null
          is_main: boolean
          location_text: string | null
          model: string | null
          posted_at: string | null
          price_cents: number
          published: boolean
          seller_name: string | null
          seller_sales: number | null
          seller_since: string | null
          shipping_label: string | null
          slug: string
          storage_capacity: string | null
          title: string
          updated_at: string
        }
        Insert: {
          brand?: string | null
          carousel_section?: string
          category?: string | null
          color?: string | null
          condition?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          installment_label?: string | null
          is_main?: boolean
          location_text?: string | null
          model?: string | null
          posted_at?: string | null
          price_cents?: number
          published?: boolean
          seller_name?: string | null
          seller_sales?: number | null
          seller_since?: string | null
          shipping_label?: string | null
          slug: string
          storage_capacity?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          brand?: string | null
          carousel_section?: string
          category?: string | null
          color?: string | null
          condition?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          installment_label?: string | null
          is_main?: boolean
          location_text?: string | null
          model?: string | null
          posted_at?: string | null
          price_cents?: number
          published?: boolean
          seller_name?: string | null
          seller_sales?: number | null
          seller_since?: string | null
          shipping_label?: string | null
          slug?: string
          storage_capacity?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_gateways: {
        Row: {
          created_at: string
          credentials: Json
          enabled: boolean
          id: string
          is_active: boolean
          name: string
          notes: string | null
          provider: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credentials?: Json
          enabled?: boolean
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          provider: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credentials?: Json
          enabled?: boolean
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      pix_payments: {
        Row: {
          amount_cents: number
          created_at: string
          external_id: string | null
          gateway_id: string | null
          gateway_provider: string | null
          id: string
          listing_id: string | null
          paid_at: string | null
          payer_document: string | null
          payer_email: string | null
          payer_name: string | null
          qrcode: string
          raw_response: Json | null
          status: string
          transaction_id: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          external_id?: string | null
          gateway_id?: string | null
          gateway_provider?: string | null
          id?: string
          listing_id?: string | null
          paid_at?: string | null
          payer_document?: string | null
          payer_email?: string | null
          payer_name?: string | null
          qrcode: string
          raw_response?: Json | null
          status?: string
          transaction_id: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          external_id?: string | null
          gateway_id?: string | null
          gateway_provider?: string | null
          id?: string
          listing_id?: string | null
          paid_at?: string | null
          payer_document?: string | null
          payer_email?: string | null
          payer_name?: string | null
          qrcode?: string
          raw_response?: Json | null
          status?: string
          transaction_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quick_replies: {
        Row: {
          content: string
          created_at: string
          display_order: number
          id: string
          label: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          display_order?: number
          id?: string
          label: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          display_order?: number
          id?: string
          label?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
