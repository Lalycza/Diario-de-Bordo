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
      clients: {
        Row: {
          atividade_principal: string | null
          bairro: string | null
          cep: string | null
          cnpj: string | null
          complemento: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          logradouro: string | null
          municipio: string | null
          nome_fantasia: string | null
          numero: string | null
          observacoes: string | null
          razao_social: string
          situacao_cadastral: string | null
          telefone: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          atividade_principal?: string | null
          bairro?: string | null
          cep?: string | null
          cnpj?: string | null
          complemento?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          logradouro?: string | null
          municipio?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          observacoes?: string | null
          razao_social: string
          situacao_cadastral?: string | null
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          atividade_principal?: string | null
          bairro?: string | null
          cep?: string | null
          cnpj?: string | null
          complemento?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          logradouro?: string | null
          municipio?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          observacoes?: string | null
          razao_social?: string
          situacao_cadastral?: string | null
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      log_entries: {
        Row: {
          analista: string | null
          created_at: string
          created_by: string | null
          data_reuniao: string
          hora_reuniao: string | null
          id: string
          observacoes: string | null
          participantes: string | null
          pauta: string | null
          pauta_dia: string | null
          project_id: string
          proximo_treinamento: string | null
          tarefa_cliente: string | null
          tarefa_hpro: string | null
          updated_at: string
        }
        Insert: {
          analista?: string | null
          created_at?: string
          created_by?: string | null
          data_reuniao: string
          hora_reuniao?: string | null
          id?: string
          observacoes?: string | null
          participantes?: string | null
          pauta?: string | null
          pauta_dia?: string | null
          project_id: string
          proximo_treinamento?: string | null
          tarefa_cliente?: string | null
          tarefa_hpro?: string | null
          updated_at?: string
        }
        Update: {
          analista?: string | null
          created_at?: string
          created_by?: string | null
          data_reuniao?: string
          hora_reuniao?: string | null
          id?: string
          observacoes?: string | null
          participantes?: string | null
          pauta?: string | null
          pauta_dia?: string | null
          project_id?: string
          proximo_treinamento?: string | null
          tarefa_cliente?: string | null
          tarefa_hpro?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "log_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          area: string | null
          created_at: string
          created_by: string | null
          data_homologacao: string | null
          data_treinamento: string | null
          grupo: string | null
          homologado_por: string | null
          id: string
          nome: string
          observacoes: string | null
          ordem: number
          parent_id: string | null
          project_id: string
          responsavel_cliente: string | null
          responsavel_hpro: string | null
          status: string
          updated_at: string
        }
        Insert: {
          area?: string | null
          created_at?: string
          created_by?: string | null
          data_homologacao?: string | null
          data_treinamento?: string | null
          grupo?: string | null
          homologado_por?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          ordem?: number
          parent_id?: string | null
          project_id: string
          responsavel_cliente?: string | null
          responsavel_hpro?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          area?: string | null
          created_at?: string
          created_by?: string | null
          data_homologacao?: string | null
          data_treinamento?: string | null
          grupo?: string | null
          homologado_por?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          ordem?: number
          parent_id?: string | null
          project_id?: string
          responsavel_cliente?: string | null
          responsavel_hpro?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      product_modules: {
        Row: {
          area: string | null
          created_at: string
          grupo: string | null
          id: string
          nome: string
          ordem: number
          parent_id: string | null
          product_id: string
          responsavel: string | null
          updated_at: string
        }
        Insert: {
          area?: string | null
          created_at?: string
          grupo?: string | null
          id?: string
          nome: string
          ordem?: number
          parent_id?: string | null
          product_id: string
          responsavel?: string | null
          updated_at?: string
        }
        Update: {
          area?: string | null
          created_at?: string
          grupo?: string | null
          id?: string
          nome?: string
          ordem?: number
          parent_id?: string | null
          product_id?: string
          responsavel?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_modules_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "product_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_modules_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          nome?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      project_analysts: {
        Row: {
          created_at: string
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_analysts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_documents: {
        Row: {
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          mime_type: string | null
          nome: string
          project_id: string
          storage_path: string
          tamanho: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          mime_type?: string | null
          nome: string
          project_id: string
          storage_path: string
          tamanho?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          mime_type?: string | null
          nome?: string
          project_id?: string
          storage_path?: string
          tamanho?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_emails: {
        Row: {
          assunto: string | null
          client_id: string | null
          conteudo: string | null
          created_at: string
          created_by: string | null
          destinatario: string
          id: string
          project_id: string
          status: string
          tipo: string | null
        }
        Insert: {
          assunto?: string | null
          client_id?: string | null
          conteudo?: string | null
          created_at?: string
          created_by?: string | null
          destinatario: string
          id?: string
          project_id: string
          status?: string
          tipo?: string | null
        }
        Update: {
          assunto?: string | null
          client_id?: string | null
          conteudo?: string | null
          created_at?: string
          created_by?: string | null
          destinatario?: string
          id?: string
          project_id?: string
          status?: string
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_emails_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_emails_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_stages: {
        Row: {
          created_at: string
          created_by: string | null
          data_conclusao: string | null
          data_inicio: string | null
          data_prevista: string | null
          data_prevista_original: string | null
          descricao: string | null
          id: string
          modulo: string | null
          nome: string
          ordem: number
          pauta_semana: boolean
          project_id: string
          responsavel: string | null
          responsavel_tipo: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_conclusao?: string | null
          data_inicio?: string | null
          data_prevista?: string | null
          data_prevista_original?: string | null
          descricao?: string | null
          id?: string
          modulo?: string | null
          nome: string
          ordem?: number
          pauta_semana?: boolean
          project_id: string
          responsavel?: string | null
          responsavel_tipo?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_conclusao?: string | null
          data_inicio?: string | null
          data_prevista?: string | null
          data_prevista_original?: string | null
          descricao?: string | null
          id?: string
          modulo?: string | null
          nome?: string
          ordem?: number
          pauta_semana?: boolean
          project_id?: string
          responsavel?: string | null
          responsavel_tipo?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_stages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          analista: string | null
          arquivado: boolean
          client_id: string | null
          cliente: string
          coordenacao: string | null
          created_at: string
          created_by: string | null
          data_entrega_original: string | null
          data_inicio: string | null
          descricao: string | null
          email_cliente: string | null
          id: string
          previsao_conclusao: string | null
          product_id: string | null
          responsavel: string | null
          updated_at: string
        }
        Insert: {
          analista?: string | null
          arquivado?: boolean
          client_id?: string | null
          cliente: string
          coordenacao?: string | null
          created_at?: string
          created_by?: string | null
          data_entrega_original?: string | null
          data_inicio?: string | null
          descricao?: string | null
          email_cliente?: string | null
          id?: string
          previsao_conclusao?: string | null
          product_id?: string | null
          responsavel?: string | null
          updated_at?: string
        }
        Update: {
          analista?: string | null
          arquivado?: boolean
          client_id?: string | null
          cliente?: string
          coordenacao?: string | null
          created_at?: string
          created_by?: string | null
          data_entrega_original?: string | null
          data_inicio?: string | null
          descricao?: string | null
          email_cliente?: string | null
          id?: string
          previsao_conclusao?: string | null
          product_id?: string | null
          responsavel?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
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
      can_access_project: { Args: { _project_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "operador"
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
      app_role: ["admin", "operador"],
    },
  },
} as const
