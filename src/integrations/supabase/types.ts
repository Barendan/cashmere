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
          tip_amount: number | null
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
          tip_amount?: number | null
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
          tip_amount?: number | null
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
          for_sale: boolean
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
          for_sale?: boolean
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
          for_sale?: boolean
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
      profiles: {
        Row: {
          email: string | null
          id: string
          name: string | null
          role: string | null
        }
        Insert: {
          email?: string | null
          id: string
          name?: string | null
          role?: string | null
        }
        Update: {
          email?: string | null
          id?: string
          name?: string | null
          role?: string | null
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
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          price: number
          updated_at?: string
        }
        Update: {
          active?: boolean
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
          parent_transaction_id: string | null
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
          parent_transaction_id?: string | null
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
          parent_transaction_id?: string | null
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
            foreignKeyName: "transactions_parent_transaction_id_fkey"
            columns: ["parent_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
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
      get_user_role: {
        Args: { user_id?: string }
        Returns: string
      }
      insert_bulk_transactions: {
        Args: { transactions: Json[] }
        Returns: {
          created_at: string
          date: string
          id: string
          parent_transaction_id: string | null
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
          parent_transaction_id: string | null
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
