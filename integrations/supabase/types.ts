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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: string | null
          id: string
          project_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          id?: string
          project_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          id?: string
          project_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_contacts: {
        Row: {
          client_id: string
          created_at: string
          email: string | null
          id: string
          is_project_responsible: boolean
          legacy_id: string | null
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          email?: string | null
          id?: string
          is_project_responsible?: boolean
          legacy_id?: string | null
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          email?: string | null
          id?: string
          is_project_responsible?: boolean
          legacy_id?: string | null
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_documents: {
        Row: {
          client_id: string
          created_at: string
          description: string | null
          id: string
          mime_type: string | null
          name: string
          size_bytes: number | null
          storage_path: string | null
          uploaded_by: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          mime_type?: string | null
          name: string
          size_bytes?: number | null
          storage_path?: string | null
          uploaded_by?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          mime_type?: string | null
          name?: string
          size_bytes?: number | null
          storage_path?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          cep: string | null
          city: string | null
          cnpj: string | null
          complement: string | null
          contact_name: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          ie: string | null
          im: string | null
          legacy_id: string | null
          neighborhood: string | null
          nome_fantasia: string | null
          notes: string | null
          number: string | null
          phone: string | null
          razao_social: string
          state: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          cep?: string | null
          city?: string | null
          cnpj?: string | null
          complement?: string | null
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          ie?: string | null
          im?: string | null
          legacy_id?: string | null
          neighborhood?: string | null
          nome_fantasia?: string | null
          notes?: string | null
          number?: string | null
          phone?: string | null
          razao_social: string
          state?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          cep?: string | null
          city?: string | null
          cnpj?: string | null
          complement?: string | null
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          ie?: string | null
          im?: string | null
          legacy_id?: string | null
          neighborhood?: string | null
          nome_fantasia?: string | null
          notes?: string | null
          number?: string | null
          phone?: string | null
          razao_social?: string
          state?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      demand_attachments: {
        Row: {
          created_at: string
          created_by: string | null
          demand_id: string
          file_name: string
          file_size: number | null
          id: string
          mime_type: string | null
          storage_path: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          demand_id: string
          file_name: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          storage_path: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          demand_id?: string
          file_name?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "demand_attachments_demand_id_fkey"
            columns: ["demand_id"]
            isOneToOne: false
            referencedRelation: "demands"
            referencedColumns: ["id"]
          },
        ]
      }
      demand_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          demand_id: string
          id: string
          snapshot: Json
          status: string | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          demand_id: string
          id?: string
          snapshot: Json
          status?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          demand_id?: string
          id?: string
          snapshot?: Json
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "demand_history_demand_id_fkey"
            columns: ["demand_id"]
            isOneToOne: false
            referencedRelation: "demands"
            referencedColumns: ["id"]
          },
        ]
      }
      demands: {
        Row: {
          commercial_proposal_approved_at: string | null
          commercial_proposal_approved_by: string | null
          commercial_proposal_sent_at: string | null
          commercial_proposal_sent_by: string | null
          created_at: string
          created_by: string | null
          delivery_deadline: string | null
          development_estimated_time: string | null
          development_evaluated_at: string | null
          development_evaluated_by: string | null
          id: string
          notes: string | null
          os_number: string | null
          priority: string
          project_id: string
          responsible_person: string | null
          scope: string
          scope_approved_at: string | null
          scope_approved_by: string | null
          scope_raised_at: string | null
          scope_raised_by: string | null
          sector: string | null
          status: string
          updated_at: string
        }
        Insert: {
          commercial_proposal_approved_at?: string | null
          commercial_proposal_approved_by?: string | null
          commercial_proposal_sent_at?: string | null
          commercial_proposal_sent_by?: string | null
          created_at?: string
          created_by?: string | null
          delivery_deadline?: string | null
          development_estimated_time?: string | null
          development_evaluated_at?: string | null
          development_evaluated_by?: string | null
          id?: string
          notes?: string | null
          os_number?: string | null
          priority?: string
          project_id: string
          responsible_person?: string | null
          scope: string
          scope_approved_at?: string | null
          scope_approved_by?: string | null
          scope_raised_at?: string | null
          scope_raised_by?: string | null
          sector?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          commercial_proposal_approved_at?: string | null
          commercial_proposal_approved_by?: string | null
          commercial_proposal_sent_at?: string | null
          commercial_proposal_sent_by?: string | null
          created_at?: string
          created_by?: string | null
          delivery_deadline?: string | null
          development_estimated_time?: string | null
          development_evaluated_at?: string | null
          development_evaluated_by?: string | null
          id?: string
          notes?: string | null
          os_number?: string | null
          priority?: string
          project_id?: string
          responsible_person?: string | null
          scope?: string
          scope_approved_at?: string | null
          scope_approved_by?: string | null
          scope_raised_at?: string | null
          scope_raised_by?: string | null
          sector?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "demands_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      diary_entries: {
        Row: {
          billing: string | null
          client_tasks: string | null
          created_at: string
          created_by: string | null
          entry_date: string
          entry_time: string | null
          hpro_tasks: string | null
          id: string
          legacy_id: string | null
          next_visit: string | null
          notes: string | null
          participants: string | null
          pauta: string | null
          project_id: string
          updated_at: string
        }
        Insert: {
          billing?: string | null
          client_tasks?: string | null
          created_at?: string
          created_by?: string | null
          entry_date?: string
          entry_time?: string | null
          hpro_tasks?: string | null
          id?: string
          legacy_id?: string | null
          next_visit?: string | null
          notes?: string | null
          participants?: string | null
          pauta?: string | null
          project_id: string
          updated_at?: string
        }
        Update: {
          billing?: string | null
          client_tasks?: string | null
          created_at?: string
          created_by?: string | null
          entry_date?: string
          entry_time?: string | null
          hpro_tasks?: string | null
          id?: string
          legacy_id?: string | null
          next_visit?: string | null
          notes?: string | null
          participants?: string | null
          pauta?: string | null
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "diary_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diary_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      handoffs: {
        Row: {
          attention: string | null
          contacts: string | null
          context: string | null
          created_at: string
          created_by: string | null
          customizations: string | null
          id: string
          integrations: string | null
          legacy_id: string | null
          parameters: string | null
          pending: string | null
          processes: string | null
          project_id: string
          responsibilities: string | null
          scenarios: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attention?: string | null
          contacts?: string | null
          context?: string | null
          created_at?: string
          created_by?: string | null
          customizations?: string | null
          id?: string
          integrations?: string | null
          legacy_id?: string | null
          parameters?: string | null
          pending?: string | null
          processes?: string | null
          project_id: string
          responsibilities?: string | null
          scenarios?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attention?: string | null
          contacts?: string | null
          context?: string | null
          created_at?: string
          created_by?: string | null
          customizations?: string | null
          id?: string
          integrations?: string | null
          legacy_id?: string | null
          parameters?: string | null
          pending?: string | null
          processes?: string | null
          project_id?: string
          responsibilities?: string | null
          scenarios?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "handoffs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handoffs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      homologations: {
        Row: {
          acceptance_confirmed: boolean
          analyst_id: string | null
          client_representative: string | null
          client_role: string | null
          created_at: string
          delivery_confirmed: boolean
          homologation_date: string | null
          id: string
          legacy_id: string | null
          observations: string | null
          project_id: string
          status: string
          training_confirmed: boolean
          updated_at: string
        }
        Insert: {
          acceptance_confirmed?: boolean
          analyst_id?: string | null
          client_representative?: string | null
          client_role?: string | null
          created_at?: string
          delivery_confirmed?: boolean
          homologation_date?: string | null
          id?: string
          legacy_id?: string | null
          observations?: string | null
          project_id: string
          status?: string
          training_confirmed?: boolean
          updated_at?: string
        }
        Update: {
          acceptance_confirmed?: boolean
          analyst_id?: string | null
          client_representative?: string | null
          client_role?: string | null
          created_at?: string
          delivery_confirmed?: boolean
          homologation_date?: string | null
          id?: string
          legacy_id?: string | null
          observations?: string | null
          project_id?: string
          status?: string
          training_confirmed?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homologations_analyst_id_fkey"
            columns: ["analyst_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homologations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      kickoffs: {
        Row: {
          content: Json
          created_at: string
          created_by: string | null
          id: string
          project_id: string
          status: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          project_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          project_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kickoffs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kickoffs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      log_entries: {
        Row: {
          created_at: string
          created_by: string | null
          data_reuniao: string
          hora_reuniao: string | null
          id: string
          observacoes: string | null
          participantes: string | null
          pauta: string | null
          project_id: string
          proximo_treinamento: string | null
          tarefa_cliente: string | null
          tarefa_hpro: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_reuniao: string
          hora_reuniao?: string | null
          id?: string
          observacoes?: string | null
          participantes?: string | null
          pauta?: string | null
          project_id: string
          proximo_treinamento?: string | null
          tarefa_cliente?: string | null
          tarefa_hpro?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_reuniao?: string
          hora_reuniao?: string | null
          id?: string
          observacoes?: string | null
          participantes?: string | null
          pauta?: string | null
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
          active: boolean
          code: string | null
          created_at: string
          description: string | null
          id: string
          legacy_id: string | null
          name: string
          product_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          legacy_id?: string | null
          name: string
          product_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          legacy_id?: string | null
          name?: string
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          code: string | null
          created_at: string
          created_by: string | null
          custom: boolean
          description: string | null
          id: string
          legacy_id: string | null
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code?: string | null
          created_at?: string
          created_by?: string | null
          custom?: boolean
          description?: string | null
          id?: string
          legacy_id?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string | null
          created_at?: string
          created_by?: string | null
          custom?: boolean
          description?: string | null
          id?: string
          legacy_id?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          client_id: string | null
          created_at: string
          email: string
          id: string
          must_change_password: boolean
          name: string
          role: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          client_id?: string | null
          created_at?: string
          email?: string
          id: string
          must_change_password?: boolean
          name?: string
          role?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          client_id?: string | null
          created_at?: string
          email?: string
          id?: string
          must_change_password?: boolean
          name?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      project_analysts: {
        Row: {
          profile_id: string
          project_id: string
        }
        Insert: {
          profile_id: string
          project_id: string
        }
        Update: {
          profile_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_analysts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
          description: string | null
          id: string
          legacy_id: string | null
          mime_type: string | null
          name: string
          project_id: string
          size_bytes: number | null
          storage_path: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          legacy_id?: string | null
          mime_type?: string | null
          name: string
          project_id: string
          size_bytes?: number | null
          storage_path?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          legacy_id?: string | null
          mime_type?: string | null
          name?: string
          project_id?: string
          size_bytes?: number | null
          storage_path?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_emails: {
        Row: {
          attachment_names: string | null
          body: string | null
          id: string
          legacy_id: string | null
          project_id: string
          recipients: string | null
          sent_at: string
          sent_by: string | null
          subject: string | null
        }
        Insert: {
          attachment_names?: string | null
          body?: string | null
          id?: string
          legacy_id?: string | null
          project_id: string
          recipients?: string | null
          sent_at?: string
          sent_by?: string | null
          subject?: string | null
        }
        Update: {
          attachment_names?: string | null
          body?: string | null
          id?: string
          legacy_id?: string | null
          project_id?: string
          recipients?: string | null
          sent_at?: string
          sent_by?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_emails_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_emails_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_go_live: {
        Row: {
          go_live_date: string | null
          id: string
          module_id: string | null
          notes: string | null
          project_id: string
          status: string
          support_active: boolean
        }
        Insert: {
          go_live_date?: string | null
          id?: string
          module_id?: string | null
          notes?: string | null
          project_id: string
          status?: string
          support_active?: boolean
        }
        Update: {
          go_live_date?: string | null
          id?: string
          module_id?: string | null
          notes?: string | null
          project_id?: string
          status?: string
          support_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "project_go_live_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_go_live_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_modules: {
        Row: {
          module_id: string
          planned_training_date: string | null
          project_id: string
        }
        Insert: {
          module_id: string
          planned_training_date?: string | null
          project_id: string
        }
        Update: {
          module_id?: string
          planned_training_date?: string | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_modules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_modules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_products: {
        Row: {
          product_id: string
          project_id: string
        }
        Insert: {
          product_id: string
          project_id: string
        }
        Update: {
          product_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_products_project_id_fkey"
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
          descricao: string | null
          id: string
          nome: string
          ordem: number
          project_id: string
          responsavel: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_conclusao?: string | null
          data_inicio?: string | null
          data_prevista?: string | null
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number
          project_id: string
          responsavel?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_conclusao?: string | null
          data_inicio?: string | null
          data_prevista?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number
          project_id?: string
          responsavel?: string | null
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
          base_date: string | null
          client_id: string | null
          cliente: string | null
          coordenacao: string | null
          coordination: string | null
          created_at: string
          created_by: string | null
          data_entrega_original: string | null
          data_inicio: string | null
          delivery_date: string | null
          descricao: string | null
          email_cliente: string | null
          finalized: boolean
          finalized_at: string | null
          finalized_by: string | null
          id: string
          legacy_id: string | null
          name: string
          original_delivery_date: string | null
          owner_id: string | null
          previsao_conclusao: string | null
          product_id: string | null
          progress: number
          responsavel: string | null
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          analista?: string | null
          arquivado?: boolean
          base_date?: string | null
          client_id?: string | null
          cliente?: string | null
          coordenacao?: string | null
          coordination?: string | null
          created_at?: string
          created_by?: string | null
          data_entrega_original?: string | null
          data_inicio?: string | null
          delivery_date?: string | null
          descricao?: string | null
          email_cliente?: string | null
          finalized?: boolean
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          legacy_id?: string | null
          name: string
          original_delivery_date?: string | null
          owner_id?: string | null
          previsao_conclusao?: string | null
          product_id?: string | null
          progress?: number
          responsavel?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          analista?: string | null
          arquivado?: boolean
          base_date?: string | null
          client_id?: string | null
          cliente?: string | null
          coordenacao?: string | null
          coordination?: string | null
          created_at?: string
          created_by?: string | null
          data_entrega_original?: string | null
          data_inicio?: string | null
          delivery_date?: string | null
          descricao?: string | null
          email_cliente?: string | null
          finalized?: boolean
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          legacy_id?: string | null
          name?: string
          original_delivery_date?: string | null
          owner_id?: string | null
          previsao_conclusao?: string | null
          product_id?: string | null
          progress?: number
          responsavel?: string | null
          start_date?: string | null
          status?: string
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
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_finalized_by_fkey"
            columns: ["finalized_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      submodules: {
        Row: {
          active: boolean
          code: string | null
          created_at: string
          description: string | null
          id: string
          legacy_id: string | null
          module_id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          legacy_id?: string | null
          module_id: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          legacy_id?: string | null
          module_id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "submodules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      surveys: {
        Row: {
          answers: Json
          created_at: string
          created_by: string | null
          id: string
          legacy_id: string | null
          observations: string | null
          product: string | null
          project_id: string
          public_enabled: boolean
          public_expires_at: string | null
          public_token: string | null
          respondent_email: string | null
          respondent_name: string | null
          respondent_role: string | null
          returned_at: string | null
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          legacy_id?: string | null
          observations?: string | null
          product?: string | null
          project_id: string
          public_enabled?: boolean
          public_expires_at?: string | null
          public_token?: string | null
          respondent_email?: string | null
          respondent_name?: string | null
          respondent_role?: string | null
          returned_at?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          answers?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          legacy_id?: string | null
          observations?: string | null
          product?: string | null
          project_id?: string
          public_enabled?: boolean
          public_expires_at?: string | null
          public_token?: string | null
          respondent_email?: string | null
          respondent_name?: string | null
          respondent_role?: string | null
          returned_at?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "surveys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      trainings: {
        Row: {
          created_at: string
          created_by: string | null
          go_live_date: string | null
          homologation_date: string | null
          homologation_responsible: string | null
          id: string
          legacy_id: string | null
          module_id: string | null
          notes: string | null
          operational_status: string
          original_planned_date: string | null
          planned_date: string | null
          planned_month: number | null
          planned_week: number | null
          project_id: string
          realization_date: string | null
          rescheduled_at: string | null
          rescheduled_by: string | null
          rescheduled_date: string | null
          responsible: string | null
          status: string
          status_before_reschedule: string | null
          subject: string | null
          submodule_id: string | null
          support_active: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          go_live_date?: string | null
          homologation_date?: string | null
          homologation_responsible?: string | null
          id?: string
          legacy_id?: string | null
          module_id?: string | null
          notes?: string | null
          operational_status?: string
          original_planned_date?: string | null
          planned_date?: string | null
          planned_month?: number | null
          planned_week?: number | null
          project_id: string
          realization_date?: string | null
          rescheduled_at?: string | null
          rescheduled_by?: string | null
          rescheduled_date?: string | null
          responsible?: string | null
          status?: string
          status_before_reschedule?: string | null
          subject?: string | null
          submodule_id?: string | null
          support_active?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          go_live_date?: string | null
          homologation_date?: string | null
          homologation_responsible?: string | null
          id?: string
          legacy_id?: string | null
          module_id?: string | null
          notes?: string | null
          operational_status?: string
          original_planned_date?: string | null
          planned_date?: string | null
          planned_month?: number | null
          planned_week?: number | null
          project_id?: string
          realization_date?: string | null
          rescheduled_at?: string | null
          rescheduled_by?: string | null
          rescheduled_date?: string | null
          responsible?: string | null
          status?: string
          status_before_reschedule?: string | null
          subject?: string | null
          submodule_id?: string | null
          support_active?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainings_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainings_submodule_id_fkey"
            columns: ["submodule_id"]
            isOneToOne: false
            referencedRelation: "submodules"
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
      admin_delete_project_by_legacy: {
        Args: { p_legacy_id: string }
        Returns: boolean
      }
      can_access_project: { Args: { _project_id: string }; Returns: boolean }
      can_edit_project: { Args: { pid: string }; Returns: boolean }
      can_view_project: { Args: { pid: string }; Returns: boolean }
      clear_must_change_password: { Args: never; Returns: boolean }
      get_public_survey_context: { Args: { p_token: string }; Returns: Json }
      get_training_status: {
        Args: {
          p_current_status: string
          p_homologation_date: string
          p_planned_date: string
          p_realization_date: string
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      my_role: { Args: never; Returns: string }
      publish_public_survey: {
        Args: {
          p_project_legacy_id: string
          p_sent_to?: string
          p_token: string
        }
        Returns: boolean
      }
      submit_public_survey: {
        Args: { p_payload: Json; p_token: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "analista"
        | "operador"
        | "comercial"
        | "cliente"
        | "supervisor"
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
      app_role: [
        "admin",
        "analista",
        "operador",
        "comercial",
        "cliente",
        "supervisor",
      ],
    },
  },
} as const
