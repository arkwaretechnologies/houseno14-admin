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
      announcements: {
        Row: {
          active: boolean
          body: string
          branch_id: string
          created_by: string | null
          id: string
          published_at: string
          title: string
        }
        Insert: {
          active?: boolean
          body: string
          branch_id: string
          created_by?: string | null
          id?: string
          published_at?: string
          title: string
        }
        Update: {
          active?: boolean
          body?: string
          branch_id?: string
          created_by?: string | null
          id?: string
          published_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_logs: {
        Row: {
          branch_id: string
          event: Database["public"]["Enums"]["attendance_event"]
          id: string
          profile_id: string
          rfid_card_id: string | null
          scanned_at: string
        }
        Insert: {
          branch_id: string
          event?: Database["public"]["Enums"]["attendance_event"]
          id?: string
          profile_id: string
          rfid_card_id?: string | null
          scanned_at?: string
        }
        Update: {
          branch_id?: string
          event?: Database["public"]["Enums"]["attendance_event"]
          id?: string
          profile_id?: string
          rfid_card_id?: string | null
          scanned_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_logs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_logs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_logs_rfid_card_id_fkey"
            columns: ["rfid_card_id"]
            isOneToOne: false
            referencedRelation: "rfid_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          after_data: Json | null
          before_data: Json | null
          branch_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          after_data?: Json | null
          before_data?: Json | null
          branch_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          after_data?: Json | null
          before_data?: Json | null
          branch_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          branch_id: string
          court_id: string
          created_at: string
          ends_at: string
          fee_cents: number
          gender: Database["public"]["Enums"]["gender"] | null
          id: string
          profile_id: string | null
          skill_level: Database["public"]["Enums"]["skill_level"] | null
          starts_at: string
          status: Database["public"]["Enums"]["booking_status"]
          type: Database["public"]["Enums"]["booking_type"]
          walk_in_id: string | null
        }
        Insert: {
          branch_id: string
          court_id: string
          created_at?: string
          ends_at: string
          fee_cents?: number
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          profile_id?: string | null
          skill_level?: Database["public"]["Enums"]["skill_level"] | null
          starts_at: string
          status?: Database["public"]["Enums"]["booking_status"]
          type?: Database["public"]["Enums"]["booking_type"]
          walk_in_id?: string | null
        }
        Update: {
          branch_id?: string
          court_id?: string
          created_at?: string
          ends_at?: string
          fee_cents?: number
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          profile_id?: string | null
          skill_level?: Database["public"]["Enums"]["skill_level"] | null
          starts_at?: string
          status?: Database["public"]["Enums"]["booking_status"]
          type?: Database["public"]["Enums"]["booking_type"]
          walk_in_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_walk_in_id_fkey"
            columns: ["walk_in_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_services: {
        Row: {
          billing_unit: Database["public"]["Enums"]["branch_service_billing_unit"]
          branch_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          price_cents: number
          service_type: Database["public"]["Enums"]["branch_service_type"]
          sort_order: number
          updated_at: string
        }
        Insert: {
          billing_unit: Database["public"]["Enums"]["branch_service_billing_unit"]
          branch_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          price_cents?: number
          service_type: Database["public"]["Enums"]["branch_service_type"]
          sort_order?: number
          updated_at?: string
        }
        Update: {
          billing_unit?: Database["public"]["Enums"]["branch_service_billing_unit"]
          branch_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          price_cents?: number
          service_type?: Database["public"]["Enums"]["branch_service_type"]
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_services_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_settings: {
        Row: {
          background_url: string | null
          branch_id: string
          default_open_play_fee_cents: number
          exclusive_close_hour: number
          exclusive_court_fee_cents: number
          exclusive_open_hour: number
          logo_url: string | null
          match_duration_mins: number
          match_rules: Json
          open_play_group_size: number
          operating_hours: Json
          payment_methods: string[]
          primary_color: string
          queue_paused: boolean
          tax_rate: number
          tv_theme: string
          updated_at: string
          walk_in_exclusive_fee_cents: number
          walk_in_open_play_fee_cents: number
        }
        Insert: {
          background_url?: string | null
          branch_id: string
          default_open_play_fee_cents?: number
          exclusive_close_hour?: number
          exclusive_court_fee_cents?: number
          exclusive_open_hour?: number
          logo_url?: string | null
          match_duration_mins?: number
          match_rules?: Json
          open_play_group_size?: number
          operating_hours?: Json
          payment_methods?: string[]
          primary_color?: string
          queue_paused?: boolean
          tax_rate?: number
          tv_theme?: string
          updated_at?: string
          walk_in_exclusive_fee_cents?: number
          walk_in_open_play_fee_cents?: number
        }
        Update: {
          background_url?: string | null
          branch_id?: string
          default_open_play_fee_cents?: number
          exclusive_close_hour?: number
          exclusive_court_fee_cents?: number
          exclusive_open_hour?: number
          logo_url?: string | null
          match_duration_mins?: number
          match_rules?: Json
          open_play_group_size?: number
          operating_hours?: Json
          payment_methods?: string[]
          primary_color?: string
          queue_paused?: boolean
          tax_rate?: number
          tv_theme?: string
          updated_at?: string
          walk_in_exclusive_fee_cents?: number
          walk_in_open_play_fee_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "branch_settings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: true
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          phone: string | null
          settings: Json
          slug: string
          timezone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          settings?: Json
          slug: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          settings?: Json
          slug?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      courts: {
        Row: {
          branch_id: string
          capacity: number
          created_at: string
          hourly_rate_cents: number
          id: string
          image_url: string | null
          is_exclusive: boolean
          is_open_play: boolean
          name: string
          notes: string | null
          operating_hours: Json
          skill_level: Database["public"]["Enums"]["skill_level"] | null
          sort_order: number
          status: Database["public"]["Enums"]["court_status"]
          updated_at: string
        }
        Insert: {
          branch_id: string
          capacity?: number
          created_at?: string
          hourly_rate_cents?: number
          id?: string
          image_url?: string | null
          is_exclusive?: boolean
          is_open_play?: boolean
          name: string
          notes?: string | null
          operating_hours?: Json
          skill_level?: Database["public"]["Enums"]["skill_level"] | null
          sort_order?: number
          status?: Database["public"]["Enums"]["court_status"]
          updated_at?: string
        }
        Update: {
          branch_id?: string
          capacity?: number
          created_at?: string
          hourly_rate_cents?: number
          id?: string
          image_url?: string | null
          is_exclusive?: boolean
          is_open_play?: boolean
          name?: string
          notes?: string | null
          operating_hours?: Json
          skill_level?: Database["public"]["Enums"]["skill_level"] | null
          sort_order?: number
          status?: Database["public"]["Enums"]["court_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_points: {
        Row: {
          id: string
          points: number
          profile_id: string
          updated_at: string
        }
        Insert: {
          id?: string
          points?: number
          profile_id: string
          updated_at?: string
        }
        Update: {
          id?: string
          points?: number
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_points_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_plans: {
        Row: {
          active: boolean
          branch_id: string
          created_at: string
          discount_percent: number
          duration_days: number
          id: string
          interval: Database["public"]["Enums"]["plan_interval"]
          name: string
          open_play_fee: number
          perks: Json
          price: number
          priority_booking: boolean
        }
        Insert: {
          active?: boolean
          branch_id: string
          created_at?: string
          discount_percent?: number
          duration_days: number
          id?: string
          interval: Database["public"]["Enums"]["plan_interval"]
          name: string
          open_play_fee?: number
          perks?: Json
          price?: number
          priority_booking?: boolean
        }
        Update: {
          active?: boolean
          branch_id?: string
          created_at?: string
          discount_percent?: number
          duration_days?: number
          id?: string
          interval?: Database["public"]["Enums"]["plan_interval"]
          name?: string
          open_play_fee?: number
          perks?: Json
          price?: number
          priority_booking?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "membership_plans_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          branch_id: string
          created_at: string
          ends_at: string
          id: string
          plan_id: string
          profile_id: string
          starts_at: string
          status: Database["public"]["Enums"]["membership_status"]
        }
        Insert: {
          branch_id: string
          created_at?: string
          ends_at: string
          id?: string
          plan_id: string
          profile_id: string
          starts_at?: string
          status?: Database["public"]["Enums"]["membership_status"]
        }
        Update: {
          branch_id?: string
          created_at?: string
          ends_at?: string
          id?: string
          plan_id?: string
          profile_id?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["membership_status"]
        }
        Relationships: [
          {
            foreignKeyName: "memberships_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      merchandise_products: {
        Row: {
          active: boolean
          barcode: string | null
          branch_id: string
          category: string
          cost_cents: number
          created_at: string
          id: string
          image_url: string | null
          low_stock_threshold: number
          name: string
          price_cents: number
          sku: string | null
          stock_qty: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          barcode?: string | null
          branch_id: string
          category?: string
          cost_cents?: number
          created_at?: string
          id?: string
          image_url?: string | null
          low_stock_threshold?: number
          name: string
          price_cents: number
          sku?: string | null
          stock_qty?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          barcode?: string | null
          branch_id?: string
          category?: string
          cost_cents?: number
          created_at?: string
          id?: string
          image_url?: string | null
          low_stock_threshold?: number
          name?: string
          price_cents?: number
          sku?: string | null
          stock_qty?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchandise_products_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_campaigns: {
        Row: {
          audience: string
          body: string
          branch_id: string | null
          channel: string
          created_at: string
          created_by: string | null
          id: string
          scheduled_at: string | null
          sent_at: string | null
          status: string
          title: string
        }
        Insert: {
          audience: string
          body: string
          branch_id?: string | null
          channel: string
          created_at?: string
          created_by?: string | null
          id?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          title: string
        }
        Update: {
          audience?: string
          body?: string
          branch_id?: string | null
          channel?: string
          created_at?: string
          created_by?: string | null
          id?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_campaigns_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          profile_id: string
          read_at: string | null
          title: string
          type: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          profile_id: string
          read_at?: string | null
          title: string
          type?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          profile_id?: string
          read_at?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      open_play_match_players: {
        Row: {
          match_id: string
          profile_id: string | null
          queue_id: string
          team: Database["public"]["Enums"]["match_team"]
          walk_in_id: string | null
        }
        Insert: {
          match_id: string
          profile_id?: string | null
          queue_id: string
          team: Database["public"]["Enums"]["match_team"]
          walk_in_id?: string | null
        }
        Update: {
          match_id?: string
          profile_id?: string | null
          queue_id?: string
          team?: Database["public"]["Enums"]["match_team"]
          walk_in_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "open_play_match_players_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "open_play_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "open_play_match_players_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "open_play_match_players_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "open_play_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "open_play_match_players_walk_in_id_fkey"
            columns: ["walk_in_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      open_play_matches: {
        Row: {
          court_id: string | null
          duration_minutes: number | null
          ended_at: string | null
          id: string
          score_a: number
          score_b: number
          session_id: string
          started_at: string
          status: Database["public"]["Enums"]["match_status"]
          winner_team: Database["public"]["Enums"]["match_team"] | null
        }
        Insert: {
          court_id?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          score_a?: number
          score_b?: number
          session_id: string
          started_at?: string
          status?: Database["public"]["Enums"]["match_status"]
          winner_team?: Database["public"]["Enums"]["match_team"] | null
        }
        Update: {
          court_id?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          score_a?: number
          score_b?: number
          session_id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["match_status"]
          winner_team?: Database["public"]["Enums"]["match_team"] | null
        }
        Relationships: [
          {
            foreignKeyName: "open_play_matches_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "open_play_matches_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "open_play_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      open_play_queue: {
        Row: {
          fee_charged_cents: number
          gender: Database["public"]["Enums"]["gender"] | null
          id: string
          joined_at: string
          lane: string
          paused: boolean
          position: number | null
          priority: number
          profile_id: string | null
          session_id: string
          skill_level: Database["public"]["Enums"]["skill_level"] | null
          status: Database["public"]["Enums"]["queue_status"]
          walk_in_id: string | null
        }
        Insert: {
          fee_charged_cents?: number
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          joined_at?: string
          lane?: string
          paused?: boolean
          position?: number | null
          priority?: number
          profile_id?: string | null
          session_id: string
          skill_level?: Database["public"]["Enums"]["skill_level"] | null
          status?: Database["public"]["Enums"]["queue_status"]
          walk_in_id?: string | null
        }
        Update: {
          fee_charged_cents?: number
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          joined_at?: string
          lane?: string
          paused?: boolean
          position?: number | null
          priority?: number
          profile_id?: string | null
          session_id?: string
          skill_level?: Database["public"]["Enums"]["skill_level"] | null
          status?: Database["public"]["Enums"]["queue_status"]
          walk_in_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "open_play_queue_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "open_play_queue_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "open_play_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "open_play_queue_walk_in_id_fkey"
            columns: ["walk_in_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      open_play_registrations: {
        Row: {
          amount_tendered_cents: number | null
          change_cents: number | null
          checked_in_at: string | null
          created_at: string
          created_by: string | null
          fee_cents: number
          full_name: string
          gender: Database["public"]["Enums"]["gender"] | null
          id: string
          paid: boolean
          paid_at: string | null
          payment_method:
            | Database["public"]["Enums"]["walk_in_payment_method"]
            | null
          profile_id: string | null
          queue_id: string | null
          session_id: string
          skill_level: Database["public"]["Enums"]["skill_level"] | null
          status: Database["public"]["Enums"]["open_play_registration_status"]
          walk_in_id: string | null
        }
        Insert: {
          amount_tendered_cents?: number | null
          change_cents?: number | null
          checked_in_at?: string | null
          created_at?: string
          created_by?: string | null
          fee_cents?: number
          full_name: string
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          paid?: boolean
          paid_at?: string | null
          payment_method?:
            | Database["public"]["Enums"]["walk_in_payment_method"]
            | null
          profile_id?: string | null
          queue_id?: string | null
          session_id: string
          skill_level?: Database["public"]["Enums"]["skill_level"] | null
          status?: Database["public"]["Enums"]["open_play_registration_status"]
          walk_in_id?: string | null
        }
        Update: {
          amount_tendered_cents?: number | null
          change_cents?: number | null
          checked_in_at?: string | null
          created_at?: string
          created_by?: string | null
          fee_cents?: number
          full_name?: string
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          paid?: boolean
          paid_at?: string | null
          payment_method?:
            | Database["public"]["Enums"]["walk_in_payment_method"]
            | null
          profile_id?: string | null
          queue_id?: string | null
          session_id?: string
          skill_level?: Database["public"]["Enums"]["skill_level"] | null
          status?: Database["public"]["Enums"]["open_play_registration_status"]
          walk_in_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "open_play_registrations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "open_play_registrations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "open_play_registrations_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "open_play_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "open_play_registrations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "open_play_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "open_play_registrations_walk_in_id_fkey"
            columns: ["walk_in_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      open_play_session_courts: {
        Row: {
          court_id: string
          created_at: string
          session_id: string
        }
        Insert: {
          court_id: string
          created_at?: string
          session_id: string
        }
        Update: {
          court_id?: string
          created_at?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "open_play_session_courts_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "open_play_session_courts_session_id_fk"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "open_play_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      open_play_sessions: {
        Row: {
          branch_id: string
          closed_at: string | null
          court_id: string | null
          created_by: string | null
          ends_at: string
          id: string
          matching_style: Database["public"]["Enums"]["open_play_matching_style"]
          max_players: number
          started_at: string | null
          starts_at: string
          status: Database["public"]["Enums"]["open_play_session_status"]
          style_config: Json
          title: string | null
        }
        Insert: {
          branch_id: string
          closed_at?: string | null
          court_id?: string | null
          created_by?: string | null
          ends_at: string
          id?: string
          matching_style?: Database["public"]["Enums"]["open_play_matching_style"]
          max_players?: number
          started_at?: string | null
          starts_at: string
          status?: Database["public"]["Enums"]["open_play_session_status"]
          style_config?: Json
          title?: string | null
        }
        Update: {
          branch_id?: string
          closed_at?: string | null
          court_id?: string | null
          created_by?: string | null
          ends_at?: string
          id?: string
          matching_style?: Database["public"]["Enums"]["open_play_matching_style"]
          max_players?: number
          started_at?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["open_play_session_status"]
          style_config?: Json
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "open_play_sessions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "open_play_sessions_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "open_play_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          profile_id: string
          status: string
          total_cents: number
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          profile_id: string
          status?: string
          total_cents?: number
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          profile_id?: string
          status?: string
          total_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      player_rankings: {
        Row: {
          branch_id: string
          elo_rating: number
          id: string
          losses: number
          matches_played: number
          profile_id: string
          rank_position: number
          season: string
          updated_at: string
          win_rate: number
          wins: number
        }
        Insert: {
          branch_id: string
          elo_rating?: number
          id?: string
          losses?: number
          matches_played?: number
          profile_id: string
          rank_position?: number
          season: string
          updated_at?: string
          win_rate?: number
          wins?: number
        }
        Update: {
          branch_id?: string
          elo_rating?: number
          id?: string
          losses?: number
          matches_played?: number
          profile_id?: string
          rank_position?: number
          season?: string
          updated_at?: string
          win_rate?: number
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "player_rankings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_rankings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          address: string | null
          branch_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          email: string | null
          full_name: string
          gender: Database["public"]["Enums"]["gender"] | null
          id: string
          phone: string | null
          skill_level: Database["public"]["Enums"]["skill_level"] | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          branch_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          full_name: string
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          phone?: string | null
          skill_level?: Database["public"]["Enums"]["skill_level"] | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          branch_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          full_name?: string
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          phone?: string | null
          skill_level?: Database["public"]["Enums"]["skill_level"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          admin_role: Database["public"]["Enums"]["admin_staff_role"] | null
          avatar_url: string | null
          branch_id: string | null
          club: string | null
          created_at: string
          date_of_birth: string | null
          elo_rating: number
          full_name: string | null
          gender: Database["public"]["Enums"]["gender"] | null
          id: string
          last_login_at: string | null
          member_code: string | null
          notes: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          skill_level: Database["public"]["Enums"]["skill_level"] | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          admin_role?: Database["public"]["Enums"]["admin_staff_role"] | null
          avatar_url?: string | null
          branch_id?: string | null
          club?: string | null
          created_at?: string
          date_of_birth?: string | null
          elo_rating?: number
          full_name?: string | null
          gender?: Database["public"]["Enums"]["gender"] | null
          id: string
          last_login_at?: string | null
          member_code?: string | null
          notes?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          skill_level?: Database["public"]["Enums"]["skill_level"] | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          admin_role?: Database["public"]["Enums"]["admin_staff_role"] | null
          avatar_url?: string | null
          branch_id?: string | null
          club?: string | null
          created_at?: string
          date_of_birth?: string | null
          elo_rating?: number
          full_name?: string | null
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          last_login_at?: string | null
          member_code?: string | null
          notes?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          skill_level?: Database["public"]["Enums"]["skill_level"] | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          branch_id: string | null
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          ends_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          starts_at: string
          target: string
          used_count: number
        }
        Insert: {
          branch_id?: string | null
          code: string
          created_at?: string
          description?: string | null
          discount_type: string
          discount_value: number
          ends_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          starts_at?: string
          target?: string
          used_count?: number
        }
        Update: {
          branch_id?: string | null
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          starts_at?: string
          target?: string
          used_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "promo_codes_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          purchase_order_id: string
          quantity: number
          unit_cost_cents: number
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          purchase_order_id: string
          quantity: number
          unit_cost_cents?: number
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          purchase_order_id?: string
          quantity?: number
          unit_cost_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "merchandise_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fke"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          branch_id: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          ordered_at: string | null
          received_at: string | null
          status: string
          supplier_id: string | null
          total_cents: number
        }
        Insert: {
          branch_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          ordered_at?: string | null
          received_at?: string | null
          status?: string
          supplier_id?: string | null
          total_cents?: number
        }
        Update: {
          branch_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          ordered_at?: string | null
          received_at?: string | null
          status?: string
          supplier_id?: string | null
          total_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          code: string
          created_at: string
          id: string
          referred_id: string | null
          referrer_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          referred_id?: string | null
          referrer_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          referred_id?: string | null
          referrer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rfid_cards: {
        Row: {
          active: boolean
          assigned_at: string | null
          branch_id: string
          card_uid: string
          created_at: string
          deactivated_at: string | null
          id: string
          profile_id: string
          replaced_by: string | null
          status: string
        }
        Insert: {
          active?: boolean
          assigned_at?: string | null
          branch_id: string
          card_uid: string
          created_at?: string
          deactivated_at?: string | null
          id?: string
          profile_id: string
          replaced_by?: string | null
          status?: string
        }
        Update: {
          active?: boolean
          assigned_at?: string | null
          branch_id?: string
          card_uid?: string
          created_at?: string
          deactivated_at?: string | null
          id?: string
          profile_id?: string
          replaced_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfid_cards_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfid_cards_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfid_cards_replaced_by_fkey"
            columns: ["replaced_by"]
            isOneToOne: false
            referencedRelation: "rfid_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      rfid_scan_logs: {
        Row: {
          branch_id: string
          card_uid: string
          id: string
          profile_id: string | null
          result: string
          rfid_card_id: string | null
          scanned_at: string
          scanner_id: string | null
        }
        Insert: {
          branch_id: string
          card_uid: string
          id?: string
          profile_id?: string | null
          result: string
          rfid_card_id?: string | null
          scanned_at?: string
          scanner_id?: string | null
        }
        Update: {
          branch_id?: string
          card_uid?: string
          id?: string
          profile_id?: string | null
          result?: string
          rfid_card_id?: string | null
          scanned_at?: string
          scanner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rfid_scan_logs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfid_scan_logs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfid_scan_logs_rfid_card_id_fkey"
            columns: ["rfid_card_id"]
            isOneToOne: false
            referencedRelation: "rfid_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_sale_items: {
        Row: {
          id: string
          line_total_cents: number
          product_id: string
          product_name: string
          quantity: number
          sale_id: string
          unit_price_cents: number
        }
        Insert: {
          id?: string
          line_total_cents: number
          product_id: string
          product_name: string
          quantity: number
          sale_id: string
          unit_price_cents: number
        }
        Update: {
          id?: string
          line_total_cents?: number
          product_id?: string
          product_name?: string
          quantity?: number
          sale_id?: string
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "shop_sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "merchandise_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "shop_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_sales: {
        Row: {
          amount_tendered_cents: number | null
          branch_id: string
          change_cents: number | null
          created_at: string
          created_by: string | null
          id: string
          payment_method: Database["public"]["Enums"]["walk_in_payment_method"]
          profile_id: string | null
          status: string
          total_cents: number
        }
        Insert: {
          amount_tendered_cents?: number | null
          branch_id: string
          change_cents?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          payment_method: Database["public"]["Enums"]["walk_in_payment_method"]
          profile_id?: string | null
          status?: string
          total_cents?: number
        }
        Update: {
          amount_tendered_cents?: number | null
          branch_id?: string
          change_cents?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          payment_method?: Database["public"]["Enums"]["walk_in_payment_method"]
          profile_id?: string | null
          status?: string
          total_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "shop_sales_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_sales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_sales_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          branch_id: string
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
        }
        Insert: {
          branch_id: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
        }
        Update: {
          branch_id?: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_brackets: {
        Row: {
          id: string
          match_data: Json
          round: number
          tournament_id: string
        }
        Insert: {
          id?: string
          match_data?: Json
          round: number
          tournament_id: string
        }
        Update: {
          id?: string
          match_data?: Json
          round?: number
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_brackets_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_divisions: {
        Row: {
          created_at: string
          entry_fee_cents: number
          id: string
          max_players: number | null
          name: string
          skill_level: Database["public"]["Enums"]["skill_level"]
          status: Database["public"]["Enums"]["tournament_status"]
          tournament_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          entry_fee_cents?: number
          id?: string
          max_players?: number | null
          name: string
          skill_level: Database["public"]["Enums"]["skill_level"]
          status?: Database["public"]["Enums"]["tournament_status"]
          tournament_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          entry_fee_cents?: number
          id?: string
          max_players?: number | null
          name?: string
          skill_level?: Database["public"]["Enums"]["skill_level"]
          status?: Database["public"]["Enums"]["tournament_status"]
          tournament_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_divisions_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_matches: {
        Row: {
          bracket_type: Database["public"]["Enums"]["tournament_bracket_type"]
          court_id: string | null
          created_at: string
          division_id: string
          id: string
          loser_next_match_id: string | null
          loser_next_slot:
            | Database["public"]["Enums"]["tournament_match_slot"]
            | null
          next_match_id: string | null
          next_slot: Database["public"]["Enums"]["tournament_match_slot"] | null
          player_a_reg_id: string | null
          player_b_reg_id: string | null
          position: number
          round: number
          score_a: number | null
          score_b: number | null
          status: Database["public"]["Enums"]["tournament_match_status"]
          tournament_id: string
          updated_at: string
          winner_reg_id: string | null
        }
        Insert: {
          bracket_type?: Database["public"]["Enums"]["tournament_bracket_type"]
          court_id?: string | null
          created_at?: string
          division_id: string
          id?: string
          loser_next_match_id?: string | null
          loser_next_slot?:
            | Database["public"]["Enums"]["tournament_match_slot"]
            | null
          next_match_id?: string | null
          next_slot?:
            | Database["public"]["Enums"]["tournament_match_slot"]
            | null
          player_a_reg_id?: string | null
          player_b_reg_id?: string | null
          position: number
          round: number
          score_a?: number | null
          score_b?: number | null
          status?: Database["public"]["Enums"]["tournament_match_status"]
          tournament_id: string
          updated_at?: string
          winner_reg_id?: string | null
        }
        Update: {
          bracket_type?: Database["public"]["Enums"]["tournament_bracket_type"]
          court_id?: string | null
          created_at?: string
          division_id?: string
          id?: string
          loser_next_match_id?: string | null
          loser_next_slot?:
            | Database["public"]["Enums"]["tournament_match_slot"]
            | null
          next_match_id?: string | null
          next_slot?:
            | Database["public"]["Enums"]["tournament_match_slot"]
            | null
          player_a_reg_id?: string | null
          player_b_reg_id?: string | null
          position?: number
          round?: number
          score_a?: number | null
          score_b?: number | null
          status?: Database["public"]["Enums"]["tournament_match_status"]
          tournament_id?: string
          updated_at?: string
          winner_reg_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_matches_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "tournament_divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_loser_next_match_id_fkey"
            columns: ["loser_next_match_id"]
            isOneToOne: false
            referencedRelation: "tournament_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_next_match_id_fkey"
            columns: ["next_match_id"]
            isOneToOne: false
            referencedRelation: "tournament_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_player_a_reg_id_fkey"
            columns: ["player_a_reg_id"]
            isOneToOne: false
            referencedRelation: "tournament_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_player_b_reg_id_fkey"
            columns: ["player_b_reg_id"]
            isOneToOne: false
            referencedRelation: "tournament_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_winner_reg_id_fkey"
            columns: ["winner_reg_id"]
            isOneToOne: false
            referencedRelation: "tournament_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_registrations: {
        Row: {
          checked_in_at: string | null
          created_at: string
          division_id: string | null
          id: string
          profile_id: string | null
          seed: number | null
          status: Database["public"]["Enums"]["tournament_registration_status"]
          tournament_id: string
          updated_at: string
          walk_in_id: string | null
        }
        Insert: {
          checked_in_at?: string | null
          created_at?: string
          division_id?: string | null
          id?: string
          profile_id?: string | null
          seed?: number | null
          status?: Database["public"]["Enums"]["tournament_registration_status"]
          tournament_id: string
          updated_at?: string
          walk_in_id?: string | null
        }
        Update: {
          checked_in_at?: string | null
          created_at?: string
          division_id?: string | null
          id?: string
          profile_id?: string | null
          seed?: number | null
          status?: Database["public"]["Enums"]["tournament_registration_status"]
          tournament_id?: string
          updated_at?: string
          walk_in_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_registrations_division_id_f"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "tournament_divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_registrations_profile_id_fk"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_registrations_walk_in_id_fk"
            columns: ["walk_in_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          advance_count: number | null
          branch_id: string
          consolation_enabled: boolean
          created_at: string
          description: string | null
          ends_at: string | null
          entry_fee_cents: number
          format: Database["public"]["Enums"]["tournament_format"]
          id: string
          max_players: number
          name: string
          starts_at: string | null
          status: Database["public"]["Enums"]["tournament_status"]
          swiss_rounds: number
          updated_at: string
        }
        Insert: {
          advance_count?: number | null
          branch_id: string
          consolation_enabled?: boolean
          created_at?: string
          description?: string | null
          ends_at?: string | null
          entry_fee_cents?: number
          format?: Database["public"]["Enums"]["tournament_format"]
          id?: string
          max_players?: number
          name: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["tournament_status"]
          swiss_rounds?: number
          updated_at?: string
        }
        Update: {
          advance_count?: number | null
          branch_id?: string
          consolation_enabled?: boolean
          created_at?: string
          description?: string | null
          ends_at?: string | null
          entry_fee_cents?: number
          format?: Database["public"]["Enums"]["tournament_format"]
          id?: string
          max_players?: number
          name?: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["tournament_status"]
          swiss_rounds?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      tv_displays: {
        Row: {
          auto_rotate: boolean
          branch_id: string
          config: Json
          created_at: string
          id: string
          is_active: boolean
          layout: string
          name: string
          rotate_seconds: number
        }
        Insert: {
          auto_rotate?: boolean
          branch_id: string
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          layout: string
          name: string
          rotate_seconds?: number
        }
        Update: {
          auto_rotate?: boolean
          branch_id?: string
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          layout?: string
          name?: string
          rotate_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "tv_displays_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      walk_in_charges: {
        Row: {
          amount_cents: number
          amount_tendered_cents: number | null
          branch_id: string
          change_cents: number | null
          created_at: string
          created_by: string | null
          id: string
          paid: boolean
          payment_method: Database["public"]["Enums"]["walk_in_payment_method"]
          product: Database["public"]["Enums"]["walk_in_product"]
          profile_id: string | null
          reference_id: string | null
          source: string
          walk_in_id: string | null
        }
        Insert: {
          amount_cents: number
          amount_tendered_cents?: number | null
          branch_id: string
          change_cents?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          paid?: boolean
          payment_method?: Database["public"]["Enums"]["walk_in_payment_method"]
          product: Database["public"]["Enums"]["walk_in_product"]
          profile_id?: string | null
          reference_id?: string | null
          source?: string
          walk_in_id?: string | null
        }
        Update: {
          amount_cents?: number
          amount_tendered_cents?: number | null
          branch_id?: string
          change_cents?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          paid?: boolean
          payment_method?: Database["public"]["Enums"]["walk_in_payment_method"]
          product?: Database["public"]["Enums"]["walk_in_product"]
          profile_id?: string | null
          reference_id?: string | null
          source?: string
          walk_in_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "walk_in_charges_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "walk_in_charges_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "walk_in_charges_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "walk_in_charges_walk_in_id_fkey"
            columns: ["walk_in_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_topups: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          payment_id: string | null
          payment_intent_id: string
          profile_id: string
          qr_expires_at: string | null
          qr_image_url: string | null
          status: Database["public"]["Enums"]["wallet_topup_status"]
          updated_at: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          id?: string
          payment_id?: string | null
          payment_intent_id: string
          profile_id: string
          qr_expires_at?: string | null
          qr_image_url?: string | null
          status?: Database["public"]["Enums"]["wallet_topup_status"]
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          payment_id?: string | null
          payment_intent_id?: string
          profile_id?: string
          qr_expires_at?: string | null
          qr_image_url?: string | null
          status?: Database["public"]["Enums"]["wallet_topup_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_topups_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount_cents: number
          approved_by: string | null
          balance_after_cents: number | null
          balance_before_cents: number | null
          created_at: string
          created_by: string | null
          id: string
          metadata: Json
          notes: string | null
          payment_method: string | null
          reference: string | null
          status: Database["public"]["Enums"]["wallet_tx_status"]
          type: Database["public"]["Enums"]["wallet_tx_type"]
          wallet_id: string
        }
        Insert: {
          amount_cents: number
          approved_by?: string | null
          balance_after_cents?: number | null
          balance_before_cents?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          payment_method?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["wallet_tx_status"]
          type: Database["public"]["Enums"]["wallet_tx_type"]
          wallet_id: string
        }
        Update: {
          amount_cents?: number
          approved_by?: string | null
          balance_after_cents?: number | null
          balance_before_cents?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          payment_method?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["wallet_tx_status"]
          type?: Database["public"]["Enums"]["wallet_tx_type"]
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance_cents: number
          currency: string
          id: string
          profile_id: string
          updated_at: string
        }
        Insert: {
          balance_cents?: number
          currency?: string
          id?: string
          profile_id: string
          updated_at?: string
        }
        Update: {
          balance_cents?: number
          currency?: string
          id?: string
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallets_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _insert_schedule_open_play_charge: {
        Args: {
          p_branch_id: string
          p_reg: Database["public"]["Tables"]["open_play_registrations"]["Row"]
        }
        Returns: undefined
      }
      activate_due_open_play_sessions: {
        Args: { p_branch_id?: string }
        Returns: number
      }
      add_open_play_registration_member: {
        Args: {
          p_gender?: Database["public"]["Enums"]["gender"]
          p_profile_id: string
          p_session_id: string
          p_skill_level?: Database["public"]["Enums"]["skill_level"]
        }
        Returns: {
          amount_tendered_cents: number | null
          change_cents: number | null
          checked_in_at: string | null
          created_at: string
          created_by: string | null
          fee_cents: number
          full_name: string
          gender: Database["public"]["Enums"]["gender"] | null
          id: string
          paid: boolean
          paid_at: string | null
          payment_method:
            | Database["public"]["Enums"]["walk_in_payment_method"]
            | null
          profile_id: string | null
          queue_id: string | null
          session_id: string
          skill_level: Database["public"]["Enums"]["skill_level"] | null
          status: Database["public"]["Enums"]["open_play_registration_status"]
          walk_in_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "open_play_registrations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      add_open_play_registration_player: {
        Args: { p_player_id: string; p_session_id: string }
        Returns: {
          amount_tendered_cents: number | null
          change_cents: number | null
          checked_in_at: string | null
          created_at: string
          created_by: string | null
          fee_cents: number
          full_name: string
          gender: Database["public"]["Enums"]["gender"] | null
          id: string
          paid: boolean
          paid_at: string | null
          payment_method:
            | Database["public"]["Enums"]["walk_in_payment_method"]
            | null
          profile_id: string | null
          queue_id: string | null
          session_id: string
          skill_level: Database["public"]["Enums"]["skill_level"] | null
          status: Database["public"]["Enums"]["open_play_registration_status"]
          walk_in_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "open_play_registrations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      add_open_play_registration_walk_in: {
        Args: {
          p_full_name: string
          p_gender: Database["public"]["Enums"]["gender"]
          p_phone?: string
          p_session_id: string
          p_skill_level: Database["public"]["Enums"]["skill_level"]
        }
        Returns: {
          amount_tendered_cents: number | null
          change_cents: number | null
          checked_in_at: string | null
          created_at: string
          created_by: string | null
          fee_cents: number
          full_name: string
          gender: Database["public"]["Enums"]["gender"] | null
          id: string
          paid: boolean
          paid_at: string | null
          payment_method:
            | Database["public"]["Enums"]["walk_in_payment_method"]
            | null
          profile_id: string | null
          queue_id: string | null
          session_id: string
          skill_level: Database["public"]["Enums"]["skill_level"] | null
          status: Database["public"]["Enums"]["open_play_registration_status"]
          walk_in_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "open_play_registrations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_wallet_topup_decide: {
        Args: { p_approve: boolean; p_notes?: string; p_tx_id: string }
        Returns: {
          amount_cents: number
          approved_by: string | null
          balance_after_cents: number | null
          balance_before_cents: number | null
          created_at: string
          created_by: string | null
          id: string
          metadata: Json
          notes: string | null
          payment_method: string | null
          reference: string | null
          status: Database["public"]["Enums"]["wallet_tx_status"]
          type: Database["public"]["Enums"]["wallet_tx_type"]
          wallet_id: string
        }
        SetofOptions: {
          from: "*"
          to: "wallet_transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_wallet_topup_request: {
        Args: {
          p_amount_cents: number
          p_notes?: string
          p_payment_method?: string
          p_profile_id: string
          p_reference?: string
        }
        Returns: {
          amount_cents: number
          approved_by: string | null
          balance_after_cents: number | null
          balance_before_cents: number | null
          created_at: string
          created_by: string | null
          id: string
          metadata: Json
          notes: string | null
          payment_method: string | null
          reference: string | null
          status: Database["public"]["Enums"]["wallet_tx_status"]
          type: Database["public"]["Enums"]["wallet_tx_type"]
          wallet_id: string
        }
        SetofOptions: {
          from: "*"
          to: "wallet_transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      assign_rfid: {
        Args: { p_branch_id: string; p_card_uid: string; p_profile_id: string }
        Returns: string
      }
      cancel_open_play_registration: {
        Args: { p_registration_id: string }
        Returns: {
          amount_tendered_cents: number | null
          change_cents: number | null
          checked_in_at: string | null
          created_at: string
          created_by: string | null
          fee_cents: number
          full_name: string
          gender: Database["public"]["Enums"]["gender"] | null
          id: string
          paid: boolean
          paid_at: string | null
          payment_method:
            | Database["public"]["Enums"]["walk_in_payment_method"]
            | null
          profile_id: string | null
          queue_id: string | null
          session_id: string
          skill_level: Database["public"]["Enums"]["skill_level"] | null
          status: Database["public"]["Enums"]["open_play_registration_status"]
          walk_in_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "open_play_registrations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_scheduled_open_play_session: {
        Args: { p_session_id: string }
        Returns: {
          branch_id: string
          closed_at: string | null
          court_id: string | null
          created_by: string | null
          ends_at: string
          id: string
          matching_style: Database["public"]["Enums"]["open_play_matching_style"]
          max_players: number
          started_at: string | null
          starts_at: string
          status: Database["public"]["Enums"]["open_play_session_status"]
          style_config: Json
          title: string | null
        }
        SetofOptions: {
          from: "*"
          to: "open_play_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      check_in_open_play_registration: {
        Args: { p_registration_id: string }
        Returns: {
          amount_tendered_cents: number | null
          change_cents: number | null
          checked_in_at: string | null
          created_at: string
          created_by: string | null
          fee_cents: number
          full_name: string
          gender: Database["public"]["Enums"]["gender"] | null
          id: string
          paid: boolean
          paid_at: string | null
          payment_method:
            | Database["public"]["Enums"]["walk_in_payment_method"]
            | null
          profile_id: string | null
          queue_id: string | null
          session_id: string
          skill_level: Database["public"]["Enums"]["skill_level"] | null
          status: Database["public"]["Enums"]["open_play_registration_status"]
          walk_in_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "open_play_registrations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      check_in_tournament_registration: {
        Args: { p_checked_in?: boolean; p_registration_id: string }
        Returns: {
          checked_in_at: string | null
          created_at: string
          division_id: string | null
          id: string
          profile_id: string | null
          seed: number | null
          status: Database["public"]["Enums"]["tournament_registration_status"]
          tournament_id: string
          updated_at: string
          walk_in_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "tournament_registrations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_open_play_match: {
        Args: {
          p_match_id: string
          p_score_a?: number
          p_score_b?: number
          p_winner_team?: Database["public"]["Enums"]["match_team"]
        }
        Returns: {
          court_id: string | null
          duration_minutes: number | null
          ended_at: string | null
          id: string
          score_a: number
          score_b: number
          session_id: string
          started_at: string
          status: Database["public"]["Enums"]["match_status"]
          winner_team: Database["public"]["Enums"]["match_team"] | null
        }
        SetofOptions: {
          from: "*"
          to: "open_play_matches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_shop_sale: {
        Args: {
          p_amount_tendered_cents?: number
          p_branch_id: string
          p_items: Json
          p_payment_method: Database["public"]["Enums"]["walk_in_payment_method"]
          p_profile_id?: string
        }
        Returns: {
          amount_tendered_cents: number | null
          branch_id: string
          change_cents: number | null
          created_at: string
          created_by: string | null
          id: string
          payment_method: Database["public"]["Enums"]["walk_in_payment_method"]
          profile_id: string | null
          status: string
          total_cents: number
        }
        SetofOptions: {
          from: "*"
          to: "shop_sales"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      count_open_play_players: {
        Args: { p_branch_id: string; p_query?: string }
        Returns: number
      }
      create_balanced_match: {
        Args: {
          p_court_id: string
          p_queue_ids: string[]
          p_session_id: string
        }
        Returns: string
      }
      create_booking: {
        Args: {
          p_court_id: string
          p_ends_at: string
          p_gender?: Database["public"]["Enums"]["gender"]
          p_skill_level?: Database["public"]["Enums"]["skill_level"]
          p_starts_at: string
          p_type?: Database["public"]["Enums"]["booking_type"]
        }
        Returns: {
          branch_id: string
          court_id: string
          created_at: string
          ends_at: string
          fee_cents: number
          gender: Database["public"]["Enums"]["gender"] | null
          id: string
          profile_id: string | null
          skill_level: Database["public"]["Enums"]["skill_level"] | null
          starts_at: string
          status: Database["public"]["Enums"]["booking_status"]
          type: Database["public"]["Enums"]["booking_type"]
          walk_in_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_manual_open_play_match: {
        Args: {
          p_court_id: string
          p_session_id: string
          p_team_a: string[]
          p_team_b: string[]
        }
        Returns: string
      }
      create_mixed_doubles_match: {
        Args: {
          p_court_id: string
          p_female_ids: string[]
          p_male_ids: string[]
          p_session_id: string
        }
        Returns: string
      }
      create_open_play_player: {
        Args: {
          p_address?: string
          p_branch_id: string
          p_email?: string
          p_full_name: string
          p_gender: Database["public"]["Enums"]["gender"]
          p_phone?: string
          p_skill_level: Database["public"]["Enums"]["skill_level"]
        }
        Returns: {
          address: string | null
          branch_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          email: string | null
          full_name: string
          gender: Database["public"]["Enums"]["gender"] | null
          id: string
          phone: string | null
          skill_level: Database["public"]["Enums"]["skill_level"] | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "players"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_scheduled_open_play_session: {
        Args: {
          p_branch_id: string
          p_court_ids?: string[]
          p_ends_at: string
          p_matching_style?: Database["public"]["Enums"]["open_play_matching_style"]
          p_max_players?: number
          p_starts_at: string
          p_style_config?: Json
          p_title: string
        }
        Returns: {
          branch_id: string
          closed_at: string | null
          court_id: string | null
          created_by: string | null
          ends_at: string
          id: string
          matching_style: Database["public"]["Enums"]["open_play_matching_style"]
          max_players: number
          started_at: string | null
          starts_at: string
          status: Database["public"]["Enums"]["open_play_session_status"]
          style_config: Json
          title: string | null
        }
        SetofOptions: {
          from: "*"
          to: "open_play_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_tournament:
        | {
            Args: {
              p_advance_count?: number
              p_branch_id: string
              p_consolation_enabled?: boolean
              p_description?: string
              p_ends_at?: string
              p_entry_fee_cents?: number
              p_format: Database["public"]["Enums"]["tournament_format"]
              p_max_players?: number
              p_name: string
              p_skill_levels?: Database["public"]["Enums"]["skill_level"][]
              p_starts_at?: string
              p_swiss_rounds?: number
            }
            Returns: {
              advance_count: number | null
              branch_id: string
              consolation_enabled: boolean
              created_at: string
              description: string | null
              ends_at: string | null
              entry_fee_cents: number
              format: Database["public"]["Enums"]["tournament_format"]
              id: string
              max_players: number
              name: string
              starts_at: string | null
              status: Database["public"]["Enums"]["tournament_status"]
              swiss_rounds: number
              updated_at: string
            }
            SetofOptions: {
              from: "*"
              to: "tournaments"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: {
              p_advance_count?: number
              p_branch_id: string
              p_consolation_enabled?: boolean
              p_description?: string
              p_ends_at?: string
              p_entry_fee_cents?: number
              p_format: Database["public"]["Enums"]["tournament_format"]
              p_max_players?: number
              p_name: string
              p_skill_entry_fees?: Json
              p_skill_levels?: Database["public"]["Enums"]["skill_level"][]
              p_starts_at?: string
              p_swiss_rounds?: number
            }
            Returns: {
              advance_count: number | null
              branch_id: string
              consolation_enabled: boolean
              created_at: string
              description: string | null
              ends_at: string | null
              entry_fee_cents: number
              format: Database["public"]["Enums"]["tournament_format"]
              id: string
              max_players: number
              name: string
              starts_at: string | null
              status: Database["public"]["Enums"]["tournament_status"]
              swiss_rounds: number
              updated_at: string
            }
            SetofOptions: {
              from: "*"
              to: "tournaments"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      finalize_ended_open_play_session: {
        Args: { p_session_id: string }
        Returns: undefined
      }
      generate_open_play_match: {
        Args: { p_court_id: string; p_session_id: string }
        Returns: string
      }
      get_admin_role: { Args: never; Returns: string }
      get_default_service_price: {
        Args: {
          p_branch_id: string
          p_type: Database["public"]["Enums"]["branch_service_type"]
        }
        Returns: number
      }
      guest_book_exclusive: {
        Args: {
          p_court_id: string
          p_email: string
          p_ends_at: string
          p_full_name: string
          p_gender?: Database["public"]["Enums"]["gender"]
          p_phone: string
          p_skill_level?: Database["public"]["Enums"]["skill_level"]
          p_starts_at: string
        }
        Returns: Json
      }
      guest_book_open_play: {
        Args: {
          p_email: string
          p_full_name: string
          p_gender?: Database["public"]["Enums"]["gender"]
          p_phone: string
          p_session_id: string
          p_skill_level?: Database["public"]["Enums"]["skill_level"]
        }
        Returns: Json
      }
      is_staff: { Args: { check_branch_id?: string }; Returns: boolean }
      join_open_play_session: {
        Args: {
          p_gender?: Database["public"]["Enums"]["gender"]
          p_session_id: string
          p_skill_level?: Database["public"]["Enums"]["skill_level"]
        }
        Returns: Json
      }
      member_register_open_play_session: {
        Args: { p_session_id: string }
        Returns: {
          amount_tendered_cents: number | null
          change_cents: number | null
          checked_in_at: string | null
          created_at: string
          created_by: string | null
          fee_cents: number
          full_name: string
          gender: Database["public"]["Enums"]["gender"] | null
          id: string
          paid: boolean
          paid_at: string | null
          payment_method:
            | Database["public"]["Enums"]["walk_in_payment_method"]
            | null
          profile_id: string | null
          queue_id: string | null
          session_id: string
          skill_level: Database["public"]["Enums"]["skill_level"] | null
          status: Database["public"]["Enums"]["open_play_registration_status"]
          walk_in_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "open_play_registrations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      open_play_session_set: {
        Args: { p_action: string; p_branch_id: string }
        Returns: {
          branch_id: string
          closed_at: string | null
          court_id: string | null
          created_by: string | null
          ends_at: string
          id: string
          matching_style: Database["public"]["Enums"]["open_play_matching_style"]
          max_players: number
          started_at: string | null
          starts_at: string
          status: Database["public"]["Enums"]["open_play_session_status"]
          style_config: Json
          title: string | null
        }
        SetofOptions: {
          from: "*"
          to: "open_play_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      pay_open_play_registration: {
        Args: {
          p_amount_tendered_cents?: number
          p_payment_method: Database["public"]["Enums"]["walk_in_payment_method"]
          p_registration_id: string
        }
        Returns: {
          amount_tendered_cents: number | null
          change_cents: number | null
          checked_in_at: string | null
          created_at: string
          created_by: string | null
          fee_cents: number
          full_name: string
          gender: Database["public"]["Enums"]["gender"] | null
          id: string
          paid: boolean
          paid_at: string | null
          payment_method:
            | Database["public"]["Enums"]["walk_in_payment_method"]
            | null
          profile_id: string | null
          queue_id: string | null
          session_id: string
          skill_level: Database["public"]["Enums"]["skill_level"] | null
          status: Database["public"]["Enums"]["open_play_registration_status"]
          walk_in_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "open_play_registrations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      pick_available_court: {
        Args: {
          p_branch_id: string
          p_preferred_court_id?: string
          p_skill?: Database["public"]["Enums"]["skill_level"]
        }
        Returns: string
      }
      purchase_membership: {
        Args: { p_plan_id: string }
        Returns: {
          branch_id: string
          created_at: string
          ends_at: string
          id: string
          plan_id: string
          profile_id: string
          starts_at: string
          status: Database["public"]["Enums"]["membership_status"]
        }
        SetofOptions: {
          from: "*"
          to: "memberships"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      queue_effective_skill: {
        Args: { p_queue_id: string }
        Returns: Database["public"]["Enums"]["skill_level"]
      }
      quote_open_play_registration_fee: {
        Args: { p_session_id: string }
        Returns: number
      }
      register_player_open_play: {
        Args: {
          p_amount_tendered_cents?: number
          p_payment_method?: Database["public"]["Enums"]["walk_in_payment_method"]
          p_player_id: string
          p_session_id: string
        }
        Returns: {
          fee_charged_cents: number
          gender: Database["public"]["Enums"]["gender"] | null
          id: string
          joined_at: string
          lane: string
          paused: boolean
          position: number | null
          priority: number
          profile_id: string | null
          session_id: string
          skill_level: Database["public"]["Enums"]["skill_level"] | null
          status: Database["public"]["Enums"]["queue_status"]
          walk_in_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "open_play_queue"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      register_tournament_player: {
        Args: {
          p_division_id: string
          p_profile_id?: string
          p_seed?: number
          p_tournament_id: string
          p_walk_in_id?: string
        }
        Returns: {
          checked_in_at: string | null
          created_at: string
          division_id: string | null
          id: string
          profile_id: string | null
          seed: number | null
          status: Database["public"]["Enums"]["tournament_registration_status"]
          tournament_id: string
          updated_at: string
          walk_in_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "tournament_registrations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      register_walk_in_exclusive: {
        Args: {
          p_court_id: string
          p_ends_at: string
          p_full_name: string
          p_gender?: Database["public"]["Enums"]["gender"]
          p_payment_method?: Database["public"]["Enums"]["walk_in_payment_method"]
          p_phone?: string
          p_skill_level?: Database["public"]["Enums"]["skill_level"]
          p_starts_at: string
        }
        Returns: Json
      }
      register_walk_in_open_play: {
        Args: {
          p_full_name: string
          p_gender?: Database["public"]["Enums"]["gender"]
          p_payment_method?: Database["public"]["Enums"]["walk_in_payment_method"]
          p_phone?: string
          p_session_id: string
          p_skill_level?: Database["public"]["Enums"]["skill_level"]
        }
        Returns: Json
      }
      resolve_court_rental_fee_cents: {
        Args: {
          p_court_id: string
          p_ends_at: string
          p_starts_at: string
          p_walk_in?: boolean
        }
        Returns: number
      }
      rfid_scan: {
        Args: { p_branch_id: string; p_card_uid: string }
        Returns: Json
      }
      search_open_play_players: {
        Args: {
          p_branch_id: string
          p_limit?: number
          p_offset?: number
          p_query?: string
        }
        Returns: {
          address: string | null
          branch_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          email: string | null
          full_name: string
          gender: Database["public"]["Enums"]["gender"] | null
          id: string
          phone: string | null
          skill_level: Database["public"]["Enums"]["skill_level"] | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "players"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      set_default_branch_service: {
        Args: { p_service_id: string }
        Returns: {
          billing_unit: Database["public"]["Enums"]["branch_service_billing_unit"]
          branch_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          price_cents: number
          service_type: Database["public"]["Enums"]["branch_service_type"]
          sort_order: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "branch_services"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_open_play_matching_style: {
        Args: {
          p_session_id: string
          p_style: Database["public"]["Enums"]["open_play_matching_style"]
          p_style_config?: Json
        }
        Returns: {
          branch_id: string
          closed_at: string | null
          court_id: string | null
          created_by: string | null
          ends_at: string
          id: string
          matching_style: Database["public"]["Enums"]["open_play_matching_style"]
          max_players: number
          started_at: string | null
          starts_at: string
          status: Database["public"]["Enums"]["open_play_session_status"]
          style_config: Json
          title: string | null
        }
        SetofOptions: {
          from: "*"
          to: "open_play_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_open_play_session_courts: {
        Args: { p_court_ids: string[]; p_session_id: string }
        Returns: {
          branch_id: string
          closed_at: string | null
          court_id: string | null
          created_by: string | null
          ends_at: string
          id: string
          matching_style: Database["public"]["Enums"]["open_play_matching_style"]
          max_players: number
          started_at: string | null
          starts_at: string
          status: Database["public"]["Enums"]["open_play_session_status"]
          style_config: Json
          title: string | null
        }
        SetofOptions: {
          from: "*"
          to: "open_play_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_tournament_registration_seed: {
        Args: { p_registration_id: string; p_seed: number }
        Returns: {
          checked_in_at: string | null
          created_at: string
          division_id: string | null
          id: string
          profile_id: string | null
          seed: number | null
          status: Database["public"]["Enums"]["tournament_registration_status"]
          tournament_id: string
          updated_at: string
          walk_in_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "tournament_registrations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      sync_all_court_statuses: { Args: never; Returns: number }
      sync_court_status: {
        Args: { p_court_id: string }
        Returns: Database["public"]["Enums"]["court_status"]
      }
      tournament_advance_winner: {
        Args: { p_match_id: string }
        Returns: undefined
      }
      tournament_assert_staff: {
        Args: { p_tournament_id: string }
        Returns: {
          advance_count: number | null
          branch_id: string
          consolation_enabled: boolean
          created_at: string
          description: string | null
          ends_at: string | null
          entry_fee_cents: number
          format: Database["public"]["Enums"]["tournament_format"]
          id: string
          max_players: number
          name: string
          starts_at: string | null
          status: Database["public"]["Enums"]["tournament_status"]
          swiss_rounds: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "tournaments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      tournament_checked_in_regs: {
        Args: { p_division_id: string }
        Returns: {
          reg_id: string
          seed_ord: number
        }[]
      }
      tournament_generate_knockout_bracket: {
        Args: {
          p_bracket_type?: Database["public"]["Enums"]["tournament_bracket_type"]
          p_consolation?: boolean
          p_division_id: string
          p_reg_ids: string[]
          p_tournament_id: string
        }
        Returns: number
      }
      tournament_next_power_of_two: { Args: { n: number }; Returns: number }
      tournament_place_player: {
        Args: {
          p_match_id: string
          p_reg_id: string
          p_slot: Database["public"]["Enums"]["tournament_match_slot"]
        }
        Returns: undefined
      }
      tournament_seed_positions: {
        Args: { bracket_size: number }
        Returns: number[]
      }
      try_matchmake: { Args: { p_session_id: string }; Returns: number }
      tv_court_match_board: {
        Args: { p_branch_id?: string }
        Returns: {
          court_code: string
          court_id: string
          court_name: string
          court_status: Database["public"]["Enums"]["court_status"]
          match_id: string
          match_status: Database["public"]["Enums"]["match_status"]
          sort_order: number
          team_a: string[]
          team_b: string[]
        }[]
      }
      tv_lobby_queue_board: { Args: { p_branch_id?: string }; Returns: Json }
      update_court_mode: {
        Args: { p_court_id: string; p_is_exclusive: boolean }
        Returns: {
          branch_id: string
          capacity: number
          created_at: string
          hourly_rate_cents: number
          id: string
          image_url: string | null
          is_exclusive: boolean
          is_open_play: boolean
          name: string
          notes: string | null
          operating_hours: Json
          skill_level: Database["public"]["Enums"]["skill_level"] | null
          sort_order: number
          status: Database["public"]["Enums"]["court_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "courts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_open_play_player: {
        Args: {
          p_address?: string
          p_email?: string
          p_full_name: string
          p_gender: Database["public"]["Enums"]["gender"]
          p_phone?: string
          p_player_id: string
          p_skill_level: Database["public"]["Enums"]["skill_level"]
        }
        Returns: {
          address: string | null
          branch_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          email: string | null
          full_name: string
          gender: Database["public"]["Enums"]["gender"] | null
          id: string
          phone: string | null
          skill_level: Database["public"]["Enums"]["skill_level"] | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "players"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_tournament: {
        Args: {
          p_advance_count?: number
          p_clear_advance_count?: boolean
          p_consolation_enabled?: boolean
          p_description?: string
          p_ends_at?: string
          p_entry_fee_cents?: number
          p_format?: Database["public"]["Enums"]["tournament_format"]
          p_max_players?: number
          p_name?: string
          p_starts_at?: string
          p_status?: Database["public"]["Enums"]["tournament_status"]
          p_swiss_rounds?: number
          p_tournament_id: string
        }
        Returns: {
          advance_count: number | null
          branch_id: string
          consolation_enabled: boolean
          created_at: string
          description: string | null
          ends_at: string | null
          entry_fee_cents: number
          format: Database["public"]["Enums"]["tournament_format"]
          id: string
          max_players: number
          name: string
          starts_at: string | null
          status: Database["public"]["Enums"]["tournament_status"]
          swiss_rounds: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "tournaments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      wallet_debit: {
        Args: {
          p_amount_cents: number
          p_metadata?: Json
          p_profile_id: string
          p_reference: string
        }
        Returns: {
          balance_cents: number
          currency: string
          id: string
          profile_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "wallets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      wallet_topup: {
        Args: { p_amount_cents: number; p_reference?: string }
        Returns: {
          balance_cents: number
          currency: string
          id: string
          profile_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "wallets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      wallet_topup_for_profile: {
        Args: {
          p_amount_cents: number
          p_profile_id: string
          p_reference: string
        }
        Returns: {
          balance_cents: number
          currency: string
          id: string
          profile_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "wallets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      admin_staff_role:
        | "super_admin"
        | "manager"
        | "cashier"
        | "receptionist"
        | "coach"
      attendance_event: "check_in" | "open_play" | "checkout"
      booking_status: "confirmed" | "cancelled" | "completed" | "no_show"
      booking_type: "exclusive" | "open_play"
      branch_service_billing_unit: "per_session" | "per_hour"
      branch_service_type: "open_play" | "court_rental"
      court_status:
        | "available"
        | "occupied"
        | "maintenance"
        | "reserved"
        | "closed"
      gender: "male" | "female"
      match_status: "assigned" | "active" | "completed"
      match_team: "a" | "b"
      membership_status: "active" | "expired" | "cancelled" | "pending"
      open_play_matching_style:
        | "auto_balanced"
        | "skill_separated"
        | "winner_loser"
        | "mixed_doubles"
        | "skill_courts"
      open_play_registration_status: "registered" | "checked_in" | "cancelled"
      open_play_session_status: "open" | "closed" | "scheduled"
      plan_interval:
        | "daily"
        | "weekly"
        | "monthly"
        | "annual"
        | "vip"
        | "quarterly"
      queue_status:
        | "waiting"
        | "playing"
        | "done"
        | "left"
        | "skipped"
        | "called"
      skill_level:
        | "beginner"
        | "novice"
        | "intermediate"
        | "advanced"
        | "professional"
      tournament_bracket_type:
        | "winners"
        | "losers"
        | "consolation"
        | "pool"
        | "swiss"
        | "knockout"
      tournament_format:
        | "single_elimination"
        | "double_elimination"
        | "round_robin"
        | "swiss"
      tournament_match_slot: "a" | "b"
      tournament_match_status: "scheduled" | "in_progress" | "completed" | "bye"
      tournament_registration_status: "registered" | "checked_in" | "withdrawn"
      tournament_status:
        | "draft"
        | "registration"
        | "seeding"
        | "ongoing"
        | "completed"
        | "cancelled"
      user_role: "member" | "staff" | "admin"
      walk_in_payment_method:
        | "cash"
        | "card"
        | "other"
        | "pay_at_venue"
        | "gcash"
      walk_in_product: "open_play" | "exclusive"
      wallet_topup_status: "pending" | "paid" | "failed" | "expired"
      wallet_tx_status:
        | "pending"
        | "approved"
        | "rejected"
        | "completed"
        | "cancelled"
      wallet_tx_type: "topup" | "payment" | "refund" | "adjustment"
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
      admin_staff_role: [
        "super_admin",
        "manager",
        "cashier",
        "receptionist",
        "coach",
      ],
      attendance_event: ["check_in", "open_play", "checkout"],
      booking_status: ["confirmed", "cancelled", "completed", "no_show"],
      booking_type: ["exclusive", "open_play"],
      branch_service_billing_unit: ["per_session", "per_hour"],
      branch_service_type: ["open_play", "court_rental"],
      court_status: [
        "available",
        "occupied",
        "maintenance",
        "reserved",
        "closed",
      ],
      gender: ["male", "female"],
      match_status: ["assigned", "active", "completed"],
      match_team: ["a", "b"],
      membership_status: ["active", "expired", "cancelled", "pending"],
      open_play_matching_style: [
        "auto_balanced",
        "skill_separated",
        "winner_loser",
        "mixed_doubles",
        "skill_courts",
      ],
      open_play_registration_status: ["registered", "checked_in", "cancelled"],
      open_play_session_status: ["open", "closed", "scheduled"],
      plan_interval: [
        "daily",
        "weekly",
        "monthly",
        "annual",
        "vip",
        "quarterly",
      ],
      queue_status: ["waiting", "playing", "done", "left", "skipped", "called"],
      skill_level: [
        "beginner",
        "novice",
        "intermediate",
        "advanced",
        "professional",
      ],
      tournament_bracket_type: [
        "winners",
        "losers",
        "consolation",
        "pool",
        "swiss",
        "knockout",
      ],
      tournament_format: [
        "single_elimination",
        "double_elimination",
        "round_robin",
        "swiss",
      ],
      tournament_match_slot: ["a", "b"],
      tournament_match_status: ["scheduled", "in_progress", "completed", "bye"],
      tournament_registration_status: ["registered", "checked_in", "withdrawn"],
      tournament_status: [
        "draft",
        "registration",
        "seeding",
        "ongoing",
        "completed",
        "cancelled",
      ],
      user_role: ["member", "staff", "admin"],
      walk_in_payment_method: [
        "cash",
        "card",
        "other",
        "pay_at_venue",
        "gcash",
      ],
      walk_in_product: ["open_play", "exclusive"],
      wallet_topup_status: ["pending", "paid", "failed", "expired"],
      wallet_tx_status: [
        "pending",
        "approved",
        "rejected",
        "completed",
        "cancelled",
      ],
      wallet_tx_type: ["topup", "payment", "refund", "adjustment"],
    },
  },
} as const
