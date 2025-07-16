export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      digital_products: {
        Row: {
          content: string
          created_at: string
          id: string
          is_used: boolean
          product_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_used?: boolean
          product_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_used?: boolean
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      email_extraction_patterns: {
        Row: {
          created_at: string
          description: string | null
          from_email: string
          id: string
          pattern_name: string
          regex_pattern: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          from_email: string
          id?: string
          pattern_name: string
          regex_pattern: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          from_email?: string
          id?: string
          pattern_name?: string
          regex_pattern?: string
          updated_at?: string
        }
        Relationships: []
      }
      Notification_Webapp: {
        Row: {
          Content: string | null
          created_at: string
          id: number
          Title: string | null
          visible: boolean | null
        }
        Insert: {
          Content?: string | null
          created_at?: string
          id?: number
          Title?: string | null
          visible?: boolean | null
        }
        Update: {
          Content?: string | null
          created_at?: string
          id?: number
          Title?: string | null
          visible?: boolean | null
        }
        Relationships: []
      }
      processed_used_goods: {
        Row: {
          created_at: string
          digit_item_ref: string
          id: string
          last_check_time: string
          start_check_time: number
          used_items: string
        }
        Insert: {
          created_at?: string
          digit_item_ref: string
          id?: string
          last_check_time?: string
          start_check_time: number
          used_items: string
        }
        Update: {
          created_at?: string
          digit_item_ref?: string
          id?: string
          last_check_time?: string
          start_check_time?: number
          used_items?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string | null
          condition_reply_output: string | null
          fornitore_url: string | null
          header_http: Json | null
          http_method: string | null
          id: string
          inbox_compatible: boolean | null
          name: string
          path_body: string | null
          payload_template: Json | null
          product_type: string
          quantity: number | null
          regex_output: string | null
          short_description: string | null
          subcategory: string | null
          value: number | null
        }
        Insert: {
          category?: string | null
          condition_reply_output?: string | null
          fornitore_url?: string | null
          header_http?: Json | null
          http_method?: string | null
          id?: string
          inbox_compatible?: boolean | null
          name: string
          path_body?: string | null
          payload_template?: Json | null
          product_type?: string
          quantity?: number | null
          regex_output?: string | null
          short_description?: string | null
          subcategory?: string | null
          value?: number | null
        }
        Update: {
          category?: string | null
          condition_reply_output?: string | null
          fornitore_url?: string | null
          header_http?: Json | null
          http_method?: string | null
          id?: string
          inbox_compatible?: boolean | null
          name?: string
          path_body?: string | null
          payload_template?: Json | null
          product_type?: string
          quantity?: number | null
          regex_output?: string | null
          short_description?: string | null
          subcategory?: string | null
          value?: number | null
        }
        Relationships: []
      }
      products_quantity: {
        Row: {
          fornitore_url: string | null
          header_http: Json | null
          http_method: string
          id: string
          path_body: string | null
          path_body_value: string | null
          payload_template: Json | null
          quantity: number | null
          regex_output: string | null
        }
        Insert: {
          fornitore_url?: string | null
          header_http?: Json | null
          http_method?: string
          id: string
          path_body?: string | null
          path_body_value?: string | null
          payload_template?: Json | null
          quantity?: number | null
          regex_output?: string | null
        }
        Update: {
          fornitore_url?: string | null
          header_http?: Json | null
          http_method?: string
          id?: string
          path_body?: string | null
          path_body_value?: string | null
          payload_template?: Json | null
          quantity?: number | null
          regex_output?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_quantity_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products_replace: {
        Row: {
          category: string | null
          condition_reply_output: string | null
          fornitore_url: string
          header_http: Json | null
          http_method: string | null
          id: string
          inbox_compatible: boolean | null
          name: string
          path_body: string | null
          payload_template: Json | null
          product_type: string
          quantity: number | null
          regex_output: string | null
          short_description: string | null
          subcategory: string | null
        }
        Insert: {
          category?: string | null
          condition_reply_output?: string | null
          fornitore_url: string
          header_http?: Json | null
          http_method?: string | null
          id?: string
          inbox_compatible?: boolean | null
          name: string
          path_body?: string | null
          payload_template?: Json | null
          product_type?: string
          quantity?: number | null
          regex_output?: string | null
          short_description?: string | null
          subcategory?: string | null
        }
        Update: {
          category?: string | null
          condition_reply_output?: string | null
          fornitore_url?: string
          header_http?: Json | null
          http_method?: string | null
          id?: string
          inbox_compatible?: boolean | null
          name?: string
          path_body?: string | null
          payload_template?: Json | null
          product_type?: string
          quantity?: number | null
          regex_output?: string | null
          short_description?: string | null
          subcategory?: string | null
        }
        Relationships: []
      }
      refund_payload_transactions: {
        Row: {
          created_at: string
          id: number
          payloads: string | null
          Timing_hour: number
        }
        Insert: {
          created_at?: string
          id?: number
          payloads?: string | null
          Timing_hour?: number
        }
        Update: {
          created_at?: string
          id?: number
          payloads?: string | null
          Timing_hour?: number
        }
        Relationships: []
      }
      refund_transactions: {
        Row: {
          created_at: string
          id: string
          refund_status: string
          Refunded: boolean | null
          response_message: string | null
          transaction_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          refund_status: string
          Refunded?: boolean | null
          response_message?: string | null
          transaction_id: string
        }
        Update: {
          created_at?: string
          id?: string
          refund_status?: string
          Refunded?: boolean | null
          response_message?: string | null
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refund_transactions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: true
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      tokens: {
        Row: {
          credits: number
          name: string
          Note: string | null
          product_id: string
          token: string
        }
        Insert: {
          credits?: number
          name?: string
          Note?: string | null
          product_id: string
          token: string
        }
        Update: {
          credits?: number
          name?: string
          Note?: string | null
          product_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "tokens_name_fkey"
            columns: ["name"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["name"]
          },
          {
            foreignKeyName: "tokens_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      tokens_master: {
        Row: {
          created_at: string
          credits: number
          id: string
          name: string
          note: string | null
          token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credits?: number
          id?: string
          name?: string
          note?: string | null
          token: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credits?: number
          id?: string
          name?: string
          note?: string | null
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          id: string
          output_result: Json | null
          product_id: string
          product_name: string | null
          qty: number
          response_data: Json | null
          status: string
          timestamp: string
          token: string
        }
        Insert: {
          id?: string
          output_result?: Json | null
          product_id: string
          product_name?: string | null
          qty: number
          response_data?: Json | null
          status: string
          timestamp?: string
          token: string
        }
        Update: {
          id?: string
          output_result?: Json | null
          product_id?: string
          product_name?: string | null
          qty?: number
          response_data?: Json | null
          status?: string
          timestamp?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_token_fkey"
            columns: ["token"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["token"]
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
      [_ in never]: never
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
    Enums: {},
  },
} as const
