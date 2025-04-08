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
      finances: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          customer_name: string | null
          date: string
          description: string | null
          id: string
          payment_method: string | null
          service_id: string | null
          type: string
          updated_at: string
          vendor: string | null
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          customer_name?: string | null
          date?: string
          description?: string | null
          id?: string
          payment_method?: string | null
          service_id?: string | null
          type: string
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          customer_name?: string | null
          date?: string
          description?: string | null
          id?: string
          payment_method?: string | null
          service_id?: string | null
          type?: string
          updated_at?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finances_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          cost_price: number
          created_at: string
          description: string | null
          id: string
          ingredients: string | null
          last_restocked: string | null
          low_stock_threshold: number
          name: string
          sell_price: number
          size: string | null
          skin_concerns: string | null
          stock_quantity: number
          updated_at: string
        }
        Insert: {
          category: string
          cost_price: number
          created_at?: string
          description?: string | null
          id?: string
          ingredients?: string | null
          last_restocked?: string | null
          low_stock_threshold?: number
          name: string
          sell_price: number
          size?: string | null
          skin_concerns?: string | null
          stock_quantity?: number
          updated_at?: string
        }
        Update: {
          category?: string
          cost_price?: number
          created_at?: string
          description?: string | null
          id?: string
          ingredients?: string | null
          last_restocked?: string | null
          low_stock_threshold?: number
          name?: string
          sell_price?: number
          size?: string | null
          skin_concerns?: string | null
          stock_quantity?: number
          updated_at?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          created_at: string
          date: string
          id: string
          notes: string | null
          payment_method: string | null
          total_amount: number
          user_id: string
          user_name: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          total_amount?: number
          user_id: string
          user_name: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          total_amount?: number
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          created_at: string
          date: string
          id: string
          price: number
          product_id: string
          product_name: string
          quantity: number
          sale_id: string | null
          type: string
          user_id: string
          user_name: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          price: number
          product_id: string
          product_name: string
          quantity: number
          sale_id?: string | null
          type: string
          user_id: string
          user_name: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          price?: number
          product_id?: string
          product_name?: string
          quantity?: number
          sale_id?: string | null
          type?: string
          user_id?: string
          user_name?: string
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
            foreignKeyName: "transactions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_sales: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          date: string
          id: string
          notes: string | null
          payment_method: string | null
          total_amount: number
          user_id: string
          user_name: string
        }[]
      }
      insert_bulk_transactions: {
        Args: { transactions: Json[] }
        Returns: {
          created_at: string
          date: string
          id: string
          price: number
          product_id: string
          product_name: string
          quantity: number
          sale_id: string | null
          type: string
          user_id: string
          user_name: string
        }[]
      }
      insert_sale: {
        Args: { p_sale: Json }
        Returns: {
          created_at: string
          date: string
          id: string
          notes: string | null
          payment_method: string | null
          total_amount: number
          user_id: string
          user_name: string
        }[]
      }
      insert_transaction_with_sale: {
        Args: { p_transaction: Json }
        Returns: {
          created_at: string
          date: string
          id: string
          price: number
          product_id: string
          product_name: string
          quantity: number
          sale_id: string | null
          type: string
          user_id: string
          user_name: string
        }[]
      }
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
