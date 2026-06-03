export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      account_fingerprints: {
        Row: {
          created_at: string;
          fingerprint_hash: string;
          id: string;
          ip_hash: string | null;
          user_agent: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          fingerprint_hash: string;
          id?: string;
          ip_hash?: string | null;
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          fingerprint_hash?: string;
          id?: string;
          ip_hash?: string | null;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      api_keys: {
        Row: {
          created_at: string;
          id: string;
          key: string;
          label: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          key: string;
          label?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          key?: string;
          label?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      community_comments: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          is_hidden: boolean;
          post_id: string;
          user_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          is_hidden?: boolean;
          post_id: string;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          is_hidden?: boolean;
          post_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "community_comments_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "community_posts";
            referencedColumns: ["id"];
          },
        ];
      };
      community_likes: {
        Row: {
          created_at: string;
          post_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          post_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          post_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "community_likes_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "community_posts";
            referencedColumns: ["id"];
          },
        ];
      };
      community_posts: {
        Row: {
          comments_count: number;
          created_at: string;
          description: string | null;
          generation_id: string | null;
          generation_type: string | null;
          id: string;
          image_url: string | null;
          is_hidden: boolean;
          likes_count: number;
          model_url: string | null;
          tags: string[] | null;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          comments_count?: number;
          created_at?: string;
          description?: string | null;
          generation_id?: string | null;
          generation_type?: string | null;
          id?: string;
          image_url?: string | null;
          is_hidden?: boolean;
          likes_count?: number;
          model_url?: string | null;
          tags?: string[] | null;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          comments_count?: number;
          created_at?: string;
          description?: string | null;
          generation_id?: string | null;
          generation_type?: string | null;
          id?: string;
          image_url?: string | null;
          is_hidden?: boolean;
          likes_count?: number;
          model_url?: string | null;
          tags?: string[] | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      credit_ledger: {
        Row: {
          amount: number;
          balance_after: number | null;
          created_at: string;
          id: string;
          kind: string;
          metadata: Json;
          reason: string | null;
          reference_id: string | null;
          user_id: string;
        };
        Insert: {
          amount: number;
          balance_after?: number | null;
          created_at?: string;
          id?: string;
          kind: string;
          metadata?: Json;
          reason?: string | null;
          reference_id?: string | null;
          user_id: string;
        };
        Update: {
          amount?: number;
          balance_after?: number | null;
          created_at?: string;
          id?: string;
          kind?: string;
          metadata?: Json;
          reason?: string | null;
          reference_id?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      generations: {
        Row: {
          created_at: string;
          credits_used: number;
          enhanced_prompt: string | null;
          generation_type: string;
          id: string;
          is_uploaded: boolean;
          project_id: string | null;
          prompt: string;
          result_data: Json;
          source: string;
          status: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          credits_used?: number;
          enhanced_prompt?: string | null;
          generation_type: string;
          id?: string;
          is_uploaded?: boolean;
          project_id?: string | null;
          prompt?: string;
          result_data?: Json;
          source?: string;
          status?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          credits_used?: number;
          enhanced_prompt?: string | null;
          generation_type?: string;
          id?: string;
          is_uploaded?: boolean;
          project_id?: string | null;
          prompt?: string;
          result_data?: Json;
          source?: string;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "generations_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      paypal_orders: {
        Row: {
          amount: number;
          captured_at: string | null;
          created_at: string;
          credits: number;
          id: string;
          raw: Json | null;
          status: string;
          user_id: string;
        };
        Insert: {
          amount: number;
          captured_at?: string | null;
          created_at?: string;
          credits: number;
          id: string;
          raw?: Json | null;
          status?: string;
          user_id: string;
        };
        Update: {
          amount?: number;
          captured_at?: string | null;
          created_at?: string;
          credits?: number;
          id?: string;
          raw?: Json | null;
          status?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          accent_color: string | null;
          api_key: string;
          avatar_seed: string | null;
          avatar_style: string | null;
          avatar_url: string;
          ban_reason: string | null;
          banned_at: string | null;
          banner_gradient: string | null;
          bio: string | null;
          created_at: string;
          credits: number;
          display_name: string;
          email: string;
          id: string;
          is_banned: boolean;
          is_manager: boolean;
          is_owner: boolean;
          owner_email: string | null;
          referral_code: string | null;
          referred_by: string | null;
          roblox_username: string | null;
          sl_username: string | null;
          updated_at: string;
        };
        Insert: {
          accent_color?: string | null;
          api_key?: string;
          avatar_seed?: string | null;
          avatar_style?: string | null;
          avatar_url?: string;
          ban_reason?: string | null;
          banned_at?: string | null;
          banner_gradient?: string | null;
          bio?: string | null;
          created_at?: string;
          credits?: number;
          display_name?: string;
          email: string;
          id: string;
          is_banned?: boolean;
          is_manager?: boolean;
          is_owner?: boolean;
          owner_email?: string | null;
          referral_code?: string | null;
          referred_by?: string | null;
          roblox_username?: string | null;
          sl_username?: string | null;
          updated_at?: string;
        };
        Update: {
          accent_color?: string | null;
          api_key?: string;
          avatar_seed?: string | null;
          avatar_style?: string | null;
          avatar_url?: string;
          ban_reason?: string | null;
          banned_at?: string | null;
          banner_gradient?: string | null;
          bio?: string | null;
          created_at?: string;
          credits?: number;
          display_name?: string;
          email?: string;
          id?: string;
          is_banned?: boolean;
          is_manager?: boolean;
          is_owner?: boolean;
          owner_email?: string | null;
          referral_code?: string | null;
          referred_by?: string | null;
          roblox_username?: string | null;
          sl_username?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          team_id: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          team_id?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          team_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      promo_codes: {
        Row: {
          active: boolean;
          code: string;
          created_at: string;
          created_by: string;
          credits: number;
          expires_at: string | null;
          id: string;
          max_uses: number | null;
          note: string | null;
          uses_count: number;
        };
        Insert: {
          active?: boolean;
          code: string;
          created_at?: string;
          created_by: string;
          credits: number;
          expires_at?: string | null;
          id?: string;
          max_uses?: number | null;
          note?: string | null;
          uses_count?: number;
        };
        Update: {
          active?: boolean;
          code?: string;
          created_at?: string;
          created_by?: string;
          credits?: number;
          expires_at?: string | null;
          id?: string;
          max_uses?: number | null;
          note?: string | null;
          uses_count?: number;
        };
        Relationships: [];
      };
      promo_redemptions: {
        Row: {
          created_at: string;
          credits_granted: number;
          id: string;
          promo_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          credits_granted: number;
          id?: string;
          promo_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          credits_granted?: number;
          id?: string;
          promo_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "promo_redemptions_promo_id_fkey";
            columns: ["promo_id"];
            isOneToOne: false;
            referencedRelation: "promo_codes";
            referencedColumns: ["id"];
          },
        ];
      };
      purchases: {
        Row: {
          amount_paid: number;
          created_at: string;
          credits: number;
          id: string;
          payment_method: string;
          status: string;
          transaction_id: string | null;
          user_id: string;
        };
        Insert: {
          amount_paid?: number;
          created_at?: string;
          credits: number;
          id?: string;
          payment_method?: string;
          status?: string;
          transaction_id?: string | null;
          user_id: string;
        };
        Update: {
          amount_paid?: number;
          created_at?: string;
          credits?: number;
          id?: string;
          payment_method?: string;
          status?: string;
          transaction_id?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      referrals: {
        Row: {
          code_used: string | null;
          created_at: string;
          id: string;
          referred_bonus: number;
          referred_user_id: string;
          referrer_bonus: number;
          referrer_id: string;
        };
        Insert: {
          code_used?: string | null;
          created_at?: string;
          id?: string;
          referred_bonus?: number;
          referred_user_id: string;
          referrer_bonus?: number;
          referrer_id: string;
        };
        Update: {
          code_used?: string | null;
          created_at?: string;
          id?: string;
          referred_bonus?: number;
          referred_user_id?: string;
          referrer_bonus?: number;
          referrer_id?: string;
        };
        Relationships: [];
      };
      roadmap_votes: {
        Row: {
          created_at: string;
          id: string;
          item_slug: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          item_slug: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          item_slug?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      team_invites: {
        Row: {
          accepted: boolean;
          accepted_at: string | null;
          created_at: string;
          email: string;
          expires_at: string;
          id: string;
          invited_by: string;
          role: string;
          team_id: string;
        };
        Insert: {
          accepted?: boolean;
          accepted_at?: string | null;
          created_at?: string;
          email: string;
          expires_at?: string;
          id?: string;
          invited_by: string;
          role?: string;
          team_id: string;
        };
        Update: {
          accepted?: boolean;
          accepted_at?: string | null;
          created_at?: string;
          email?: string;
          expires_at?: string;
          id?: string;
          invited_by?: string;
          role?: string;
          team_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "team_invites_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      team_members: {
        Row: {
          created_at: string;
          id: string;
          role: string;
          team_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role?: string;
          team_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: string;
          team_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      teams: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          owner_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          owner_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          owner_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      roadmap_vote_counts: {
        Row: {
          item_slug: string | null;
          vote_count: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      accept_team_invite: { Args: { _invite_id: string }; Returns: string };
      add_credits: {
        Args: {
          amount: number;
          amount_paid?: number;
          payment_method?: string;
          transaction_id?: string;
          user_uuid: string;
        };
        Returns: number;
      };
      admin_adjust_credits: {
        Args: { delta: number; note?: string; target_user_id: string };
        Returns: number;
      };
      admin_approve_purchase: { Args: { _purchase_id: string }; Returns: Json };
      admin_create_promo: {
        Args: {
          _code?: string;
          _credits?: number;
          _expires_at?: string;
          _max_uses?: number;
          _note?: string;
        };
        Returns: {
          active: boolean;
          code: string;
          created_at: string;
          created_by: string;
          credits: number;
          expires_at: string | null;
          id: string;
          max_uses: number | null;
          note: string | null;
          uses_count: number;
        };
        SetofOptions: {
          from: "*";
          to: "promo_codes";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      admin_delete_generation: { Args: { gen_id: string }; Returns: boolean };
      admin_delete_promo: { Args: { _id: string }; Returns: boolean };
      admin_get_analytics: { Args: never; Returns: Json };
      admin_list_pending_purchases: {
        Args: never;
        Returns: {
          amount_paid: number;
          created_at: string;
          credits: number;
          display_name: string;
          email: string;
          id: string;
          payment_method: string;
          transaction_id: string;
          user_id: string;
        }[];
      };
      admin_reject_purchase: {
        Args: { _note?: string; _purchase_id: string };
        Returns: boolean;
      };
      admin_set_banned: {
        Args: { reason?: string; target_user_id: string; value: boolean };
        Returns: boolean;
      };
      admin_set_manager: {
        Args: { target_user_id: string; value: boolean };
        Returns: boolean;
      };
      admin_set_owner: {
        Args: { target_user_id: string; value: boolean };
        Returns: boolean;
      };
      admin_toggle_promo: {
        Args: { _active: boolean; _id: string };
        Returns: boolean;
      };
      admin_wipe_user_generations: {
        Args: { target_user_id: string };
        Returns: number;
      };
      apply_referral: { Args: { _code: string }; Returns: Json };
      create_api_key: {
        Args: { key_label?: string; user_uuid: string };
        Returns: {
          created_at: string;
          id: string;
          key: string;
          label: string;
          user_id: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "api_keys";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      create_team: { Args: { _name: string }; Returns: string };
      deduct_credits: {
        Args: { amount: number; user_uuid: string };
        Returns: number;
      };
      fingerprint_already_used: {
        Args: { _fingerprint_hash: string; _ip_hash: string };
        Returns: boolean;
      };
      get_credit_reconciliation: {
        Args: never;
        Returns: {
          diff: number;
          display_name: string;
          email: string;
          is_owner: boolean;
          last_entry_at: string;
          ledger_entries: number;
          ledger_sum: number;
          profile_credits: number;
          user_id: string;
        }[];
      };
      get_user_ledger: {
        Args: { _limit?: number; _offset?: number; target_user_id: string };
        Returns: {
          amount: number;
          balance_after: number;
          created_at: string;
          id: string;
          kind: string;
          metadata: Json;
          reason: string;
          reference_id: string;
          user_id: string;
        }[];
      };
      get_user_stats: { Args: { user_uuid: string }; Returns: Json };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      invite_to_team: {
        Args: { _email: string; _role?: string; _team_id: string };
        Returns: string;
      };
      is_team_member: {
        Args: { _team_id: string; _user_id: string };
        Returns: boolean;
      };
      is_team_owner: {
        Args: { _team_id: string; _user_id: string };
        Returns: boolean;
      };
      log_credit_change: {
        Args: {
          _amount: number;
          _kind: string;
          _metadata?: Json;
          _reason?: string;
          _reference_id?: string;
          _user_id: string;
        };
        Returns: undefined;
      };
      redeem_promo: { Args: { _code: string }; Returns: Json };
      regenerate_api_key_for: {
        Args: { target_user_id: string };
        Returns: string;
      };
      submit_purchase_request: {
        Args: {
          _amount: number;
          _credits: number;
          _payment_method?: string;
          _transaction_id: string;
        };
        Returns: string;
      };
    };
    Enums: {
      app_role: "owner" | "admin" | "user";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["owner", "admin", "user"],
    },
  },
} as const;
