
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "comments": {
                  Row: {
                    "body": string,"created_at": string,"game_id": number,"id": number,"member_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"game_id": number,"id"?: never,"member_id"?: string,"updated_at"?: string
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"game_id"?: number,"id"?: never,"member_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "comments_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "game_stats"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comments_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comments_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"game_owners": {
                  Row: {
                    "created_at": string,"game_id": number,"member_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"game_id": number,"member_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"game_id"?: number,"member_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "game_owners_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "game_stats"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "game_owners_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "game_owners_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"games": {
                  Row: {
                    "added_by": string | null,"cover_path": string | null,"created_at": string,"description": string | null,"id": number,"name": string,"name_normalized": string | null,"play_time_max": number | null,"play_time_min": number | null,"players_max": number | null,"players_min": number | null,"source_id": string | null,"source_kind": Database["public"]['Enums']["game_source_kind"],"source_provider": string | null,"source_url": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "added_by"?: string | null,"cover_path"?: string | null,"created_at"?: string,"description"?: string | null,"id"?: never,"name": string,"name_normalized"?: never,"play_time_max"?: number | null,"play_time_min"?: number | null,"players_max"?: number | null,"players_min"?: number | null,"source_id"?: string | null,"source_kind"?: Database["public"]['Enums']["game_source_kind"],"source_provider"?: string | null,"source_url"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "added_by"?: string | null,"cover_path"?: string | null,"created_at"?: string,"description"?: string | null,"id"?: never,"name"?: string,"name_normalized"?: never,"play_time_max"?: number | null,"play_time_min"?: number | null,"players_max"?: number | null,"players_min"?: number | null,"source_id"?: string | null,"source_kind"?: Database["public"]['Enums']["game_source_kind"],"source_provider"?: string | null,"source_url"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "games_added_by_fkey"
      columns: ["added_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_path": string | null,"created_at": string,"display_name": string,"id": string,"role": Database["public"]['Enums']["member_role"],"status": Database["public"]['Enums']["member_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_path"?: string | null,"created_at"?: string,"display_name": string,"id": string,"role"?: Database["public"]['Enums']["member_role"],"status"?: Database["public"]['Enums']["member_status"]
                  }
                  Update: {
                    "avatar_path"?: string | null,"created_at"?: string,"display_name"?: string,"id"?: string,"role"?: Database["public"]['Enums']["member_role"],"status"?: Database["public"]['Enums']["member_status"]
                  }
                  Relationships: [
                    
                  ]
                },"ratings": {
                  Row: {
                    "best_players": number,"comment": string | null,"created_at": string,"entertainment": number,"game_id": number,"id": number,"luck": number,"member_id": string,"recommendation": number,"strategy": number,"time_to_learn": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "best_players": number,"comment"?: string | null,"created_at"?: string,"entertainment": number,"game_id": number,"id"?: never,"luck": number,"member_id"?: string,"recommendation": number,"strategy": number,"time_to_learn": number,"updated_at"?: string
                  }
                  Update: {
                    "best_players"?: number,"comment"?: string | null,"created_at"?: string,"entertainment"?: number,"game_id"?: number,"id"?: never,"luck"?: number,"member_id"?: string,"recommendation"?: number,"strategy"?: number,"time_to_learn"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ratings_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "game_stats"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ratings_game_id_fkey"
      columns: ["game_id"]
isOneToOne: false
      referencedRelation: "games"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ratings_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "game_stats": {
                  Row: {
                    "added_by": string | null,"avg_entertainment": number | null,"avg_luck": number | null,"avg_recommendation": number | null,"avg_strategy": number | null,"avg_time_to_learn": number | null,"best_players_mode": number | null,"cover_path": string | null,"created_at": string | null,"description": string | null,"id": number | null,"name": string | null,"name_normalized": string | null,"owner_count": number | null,"play_time_max": number | null,"play_time_min": number | null,"players_max": number | null,"players_min": number | null,"rating_count": number | null,"source_id": string | null,"source_kind": Database["public"]['Enums']["game_source_kind"] | null,"source_provider": string | null,"source_url": string | null,"updated_at": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "games_added_by_fkey"
      columns: ["added_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            [_ in never]: never
          }
          Enums: {
            "game_source_kind": "manual"|"lookup"|"link","member_role": "member"|"admin","member_status": "active"|"disabled"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "game_source_kind": ["manual", "lookup", "link"],"member_role": ["member", "admin"],"member_status": ["active", "disabled"]
          }
        }
} as const
