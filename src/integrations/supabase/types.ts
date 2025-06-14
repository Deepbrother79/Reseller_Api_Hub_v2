export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      products: {
        Row: {
          condition_reply_output: string | null
          fornitore_url: string
          header_http: Json | null
          http_method: string | null
          id: string
          name: string
          path_body: string | null
          payload_template: Json | null
          product_type: string
          quantity: number | null
          regex_output: string | null
        }
        Insert: {
          condition_reply_output?: string | null
          fornitore_url: string
          header_http?: Json | null
          http_method?: string | null
          id?: string
          name: string
          path_body?: string | null
          payload_template?: Json | null
          product_type?: string
          quantity?: number | null
          regex_output?: string | null
        }
        Update: {
          condition_reply_output?: string | null
          fornitore_url?: string
          header_http?: Json | null
          http_method?: string | null
          id?: string
          name?: string
          path_body?: string | null
          payload_template?: Json | null
          product_type?: string
          quantity?: number | null
          regex_output?: string | null
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
      refund_transactions: {
        Row: {
          created_at: string
          id: string
          refund_status: string
          response_message: string | null
          transaction_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          refund_status: string
          response_message?: string | null
          transaction_id: string
        }
        Update: {
          created_at?: string
          id?: string
          refund_status?: string
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
          product_id: string
          token: string
        }
        Insert: {
          credits?: number
          name?: string
          product_id: string
          token: string
        }
        Update: {
          credits?: number
          name?: string
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
