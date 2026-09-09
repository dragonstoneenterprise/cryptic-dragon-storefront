/**
 * Generated from the live schema with the Supabase MCP
 * (`generate_typescript_types`, project `awpvdpjbjmofodlbleol`).
 *
 * Regenerate rather than hand-edit after a migration. Trimmed to the
 * `Tables` shapes this app actually queries — the generator's `Views`,
 * `Functions`, `Enums` and `CompositeTypes` blocks are all empty for this
 * schema, and the `Tables<>` / `TablesInsert<>` helper conditionals it
 * emits are unused here since every call site names its row type directly.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      addresses: {
        Row: {
          id: string;
          user_id: string;
          label: string | null;
          full_name: string;
          line1: string;
          line2: string | null;
          city: string;
          state: string;
          postal_code: string;
          country: string;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          label?: string | null;
          full_name: string;
          line1: string;
          line2?: string | null;
          city: string;
          state: string;
          postal_code: string;
          country?: string;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          label?: string | null;
          full_name?: string;
          line1?: string;
          line2?: string | null;
          city?: string;
          state?: string;
          postal_code?: string;
          country?: string;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      carts: {
        Row: {
          user_id: string;
          lines: Json;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          lines?: Json;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          lines?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          user_id: string | null;
          order_number: string;
          stripe_payment_intent_id: string;
          email: string;
          status: string;
          currency: string;
          subtotal: number;
          shipping: number;
          tax: number;
          total: number;
          item_count: number;
          lines: Json;
          shipping_address: Json;
          arriving: string | null;
          placed_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          order_number: string;
          stripe_payment_intent_id: string;
          email: string;
          status?: string;
          currency?: string;
          subtotal: number;
          shipping: number;
          tax: number;
          total: number;
          item_count: number;
          lines: Json;
          shipping_address: Json;
          arriving?: string | null;
          placed_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          order_number?: string;
          stripe_payment_intent_id?: string;
          email?: string;
          status?: string;
          currency?: string;
          subtotal?: number;
          shipping?: number;
          tax?: number;
          total?: number;
          item_count?: number;
          lines?: Json;
          shipping_address?: Json;
          arriving?: string | null;
          placed_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

/**
 * The `jsonb` boundary.
 *
 * `Json` requires an index signature, and a TypeScript `interface` does not
 * have one — so `CartLine` and `ShippingAddress` are not assignable to it
 * even though both serialise to perfectly ordinary JSON. This is a structural
 * typing wrinkle, not a real mismatch.
 *
 * It is one function rather than a cast at each call site so that the
 * unchecked step is in a single place with this note attached to it. It is
 * only ever used on values this codebase constructs — a re-priced `CartLine[]`
 * and a `ShippingAddress` built from a verified payment — never on anything
 * inbound. Values read back out of `jsonb` go the other way and are validated
 * (`isCartLine`, `parseAddress`), because those genuinely can be any shape.
 */
export function toJson<T>(value: T): Json {
  return value as unknown as Json;
}

export type AddressRow = Database["public"]["Tables"]["addresses"]["Row"];
export type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type CartRow = Database["public"]["Tables"]["carts"]["Row"];
