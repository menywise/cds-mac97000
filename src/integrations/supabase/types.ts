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
      activites: {
        Row: {
          cadran: string | null
          categorie: string
          code: string
          code_naf_2025: string | null
          libelle: string
          source: string
          statut: string
          type: string
          updated_at: string
        }
        Insert: {
          cadran?: string | null
          categorie: string
          code: string
          code_naf_2025?: string | null
          libelle: string
          source?: string
          statut?: string
          type: string
          updated_at?: string
        }
        Update: {
          cadran?: string | null
          categorie?: string
          code?: string
          code_naf_2025?: string | null
          libelle?: string
          source?: string
          statut?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      ad_campaigns: {
        Row: {
          active: boolean
          advertiser: string
          affiliate_code: string
          alt_text: string
          commission_pct: number
          contact_email: string
          created_at: string
          ends_at: string | null
          id: string
          image_url: string | null
          link_url: string
          placement_id: string
          starts_at: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          advertiser: string
          affiliate_code?: string
          alt_text?: string
          commission_pct?: number
          contact_email?: string
          created_at?: string
          ends_at?: string | null
          id?: string
          image_url?: string | null
          link_url: string
          placement_id: string
          starts_at?: string | null
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          advertiser?: string
          affiliate_code?: string
          alt_text?: string
          commission_pct?: number
          contact_email?: string
          created_at?: string
          ends_at?: string | null
          id?: string
          image_url?: string | null
          link_url?: string
          placement_id?: string
          starts_at?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_campaigns_placement_id_fkey"
            columns: ["placement_id"]
            isOneToOne: false
            referencedRelation: "ad_placements"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_events: {
        Row: {
          campaign_id: string
          created_at: string
          event_type: string
          id: string
          page_path: string
          user_agent: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          event_type: string
          id?: string
          page_path?: string
          user_agent?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          event_type?: string
          id?: string
          page_path?: string
          user_agent?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_placements: {
        Row: {
          active: boolean
          created_at: string
          format: string
          height: number | null
          id: string
          location: string
          name: string
          slug: string
          width: number | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          format?: string
          height?: number | null
          id?: string
          location?: string
          name: string
          slug: string
          width?: number | null
        }
        Update: {
          active?: boolean
          created_at?: string
          format?: string
          height?: number | null
          id?: string
          location?: string
          name?: string
          slug?: string
          width?: number | null
        }
        Relationships: []
      }
      appels_action: {
        Row: {
          actif: boolean
          bouton: string
          created_at: string
          id: string
          lien: string
          nom: string
          texte: string
          titre: string
        }
        Insert: {
          actif?: boolean
          bouton: string
          created_at?: string
          id?: string
          lien: string
          nom: string
          texte?: string
          titre: string
        }
        Update: {
          actif?: boolean
          bouton?: string
          created_at?: string
          id?: string
          lien?: string
          nom?: string
          texte?: string
          titre?: string
        }
        Relationships: []
      }
      audit_findings: {
        Row: {
          audit_id: string
          code: string
          created_at: string
          description: string
          id: string
          location: string
          resolved: boolean
          severity: string
        }
        Insert: {
          audit_id: string
          code: string
          created_at?: string
          description?: string
          id?: string
          location?: string
          resolved?: boolean
          severity?: string
        }
        Update: {
          audit_id?: string
          code?: string
          created_at?: string
          description?: string
          id?: string
          location?: string
          resolved?: boolean
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_findings_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "audits"
            referencedColumns: ["id"]
          },
        ]
      }
      audits: {
        Row: {
          created_at: string
          id: string
          label: string
          max_score: number
          performed_at: string
          score: number
          summary: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          max_score?: number
          performed_at?: string
          score?: number
          summary?: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          max_score?: number
          performed_at?: string
          score?: number
          summary?: string
        }
        Relationships: []
      }
      blog_comments: {
        Row: {
          approved: boolean
          author_id: string
          author_name: string
          content: string
          created_at: string
          id: string
          moderated_at: string | null
          moderated_by: string | null
          moderation_note: string | null
          post_id: string
        }
        Insert: {
          approved?: boolean
          author_id: string
          author_name?: string
          content: string
          created_at?: string
          id?: string
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_note?: string | null
          post_id: string
        }
        Update: {
          approved?: boolean
          author_id?: string
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_note?: string | null
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "contenus_publics"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          handled_at: string | null
          id: string
          message: string
          name: string
          status: string
          subject: string
        }
        Insert: {
          created_at?: string
          email: string
          handled_at?: string | null
          id?: string
          message: string
          name: string
          status?: string
          subject: string
        }
        Update: {
          created_at?: string
          email?: string
          handled_at?: string | null
          id?: string
          message?: string
          name?: string
          status?: string
          subject?: string
        }
        Relationships: []
      }
      contenus_publics: {
        Row: {
          appel_action_id: string | null
          auteur_fonction: string
          auteur_id: string | null
          auteur_nom: string
          chapo: string
          corps: string
          created_at: string
          date_prevue: string | null
          description: string
          est_pilier: boolean
          etiquettes: string[]
          evenement: string
          evenement_le: string | null
          genre: string
          id: string
          image_alt: string
          image_url: string | null
          intention: string
          libelle_menu: string
          liens_interets: string
          niveau_preuve: string
          ordre: number
          pilier_id: string | null
          public_vise: string
          publie: boolean
          publie_le: string | null
          relecteurs: string[]
          relu_le: string | null
          relu_par: string | null
          requete_visee: string
          rubrique_id: string | null
          search_doc: unknown
          serie_id: string | null
          serie_ordre: number | null
          slug: string
          sources: string
          statut: string
          titre: string
          type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          appel_action_id?: string | null
          auteur_fonction?: string
          auteur_id?: string | null
          auteur_nom?: string
          chapo?: string
          corps?: string
          created_at?: string
          date_prevue?: string | null
          description?: string
          est_pilier?: boolean
          etiquettes?: string[]
          evenement?: string
          evenement_le?: string | null
          genre?: string
          id?: string
          image_alt?: string
          image_url?: string | null
          intention?: string
          libelle_menu?: string
          liens_interets?: string
          niveau_preuve?: string
          ordre?: number
          pilier_id?: string | null
          public_vise?: string
          publie?: boolean
          publie_le?: string | null
          relecteurs?: string[]
          relu_le?: string | null
          relu_par?: string | null
          requete_visee?: string
          rubrique_id?: string | null
          search_doc?: unknown
          serie_id?: string | null
          serie_ordre?: number | null
          slug: string
          sources?: string
          statut?: string
          titre: string
          type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          appel_action_id?: string | null
          auteur_fonction?: string
          auteur_id?: string | null
          auteur_nom?: string
          chapo?: string
          corps?: string
          created_at?: string
          date_prevue?: string | null
          description?: string
          est_pilier?: boolean
          etiquettes?: string[]
          evenement?: string
          evenement_le?: string | null
          genre?: string
          id?: string
          image_alt?: string
          image_url?: string | null
          intention?: string
          libelle_menu?: string
          liens_interets?: string
          niveau_preuve?: string
          ordre?: number
          pilier_id?: string | null
          public_vise?: string
          publie?: boolean
          publie_le?: string | null
          relecteurs?: string[]
          relu_le?: string | null
          relu_par?: string | null
          requete_visee?: string
          rubrique_id?: string | null
          search_doc?: unknown
          serie_id?: string | null
          serie_ordre?: number | null
          slug?: string
          sources?: string
          statut?: string
          titre?: string
          type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      contenus_publics_journal: {
        Row: {
          auto: boolean
          contenu_id: string
          created_at: string
          de: string | null
          id: string
          motif: string
          par: string | null
          vers: string
        }
        Insert: {
          auto?: boolean
          contenu_id: string
          created_at?: string
          de?: string | null
          id?: string
          motif?: string
          par?: string | null
          vers: string
        }
        Update: {
          auto?: boolean
          contenu_id?: string
          created_at?: string
          de?: string | null
          id?: string
          motif?: string
          par?: string | null
          vers?: string
        }
        Relationships: [
          {
            foreignKeyName: "contenus_publics_journal_contenu_id_fkey"
            columns: ["contenu_id"]
            isOneToOne: false
            referencedRelation: "contenus_publics"
            referencedColumns: ["id"]
          },
        ]
      }
      contenus_publics_versions: {
        Row: {
          chapo: string
          contenu_id: string
          corps: string
          created_at: string
          description: string
          id: string
          numero: number
          par: string | null
          sources: string
          titre: string
        }
        Insert: {
          chapo: string
          contenu_id: string
          corps: string
          created_at?: string
          description: string
          id?: string
          numero: number
          par?: string | null
          sources: string
          titre: string
        }
        Update: {
          chapo?: string
          contenu_id?: string
          corps?: string
          created_at?: string
          description?: string
          id?: string
          numero?: number
          par?: string | null
          sources?: string
          titre?: string
        }
        Relationships: [
          {
            foreignKeyName: "contenus_publics_versions_contenu_id_fkey"
            columns: ["contenu_id"]
            isOneToOne: false
            referencedRelation: "contenus_publics"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          user_a?: string
          user_b?: string
        }
        Relationships: []
      }
      crm_actions: {
        Row: {
          created_at: string
          done: boolean
          done_at: string | null
          due_date: string | null
          id: string
          owner_id: string
          prospect_id: string | null
          title: string
        }
        Insert: {
          created_at?: string
          done?: boolean
          done_at?: string | null
          due_date?: string | null
          id?: string
          owner_id: string
          prospect_id?: string | null
          title: string
        }
        Update: {
          created_at?: string
          done?: boolean
          done_at?: string | null
          due_date?: string | null
          id?: string
          owner_id?: string
          prospect_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_actions_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "crm_prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_interactions: {
        Row: {
          content: string
          created_at: string
          id: string
          owner_id: string
          prospect_id: string
          type: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          owner_id: string
          prospect_id: string
          type?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          owner_id?: string
          prospect_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_interactions_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "crm_prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_prospects: {
        Row: {
          active: boolean
          company: string
          created_at: string
          email: string
          id: string
          name: string
          notes: string
          owner_id: string
          phone: string
          sector: string
          source: string
          stage: string
          tags: string[]
          updated_at: string
        }
        Insert: {
          active?: boolean
          company?: string
          created_at?: string
          email?: string
          id?: string
          name: string
          notes?: string
          owner_id: string
          phone?: string
          sector?: string
          source?: string
          stage?: string
          tags?: string[]
          updated_at?: string
        }
        Update: {
          active?: boolean
          company?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          notes?: string
          owner_id?: string
          phone?: string
          sector?: string
          source?: string
          stage?: string
          tags?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      directory_categories: {
        Row: {
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          position: number
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name: string
          position?: number
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          position?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      directory_listings: {
        Row: {
          address: string
          category_id: string | null
          city: string
          claim_requested_at: string | null
          claim_requested_by: string | null
          claimed_at: string | null
          claimed_by: string | null
          cover_url: string | null
          created_at: string
          created_by: string | null
          departement: string | null
          description: string
          email: string
          excerpt: string
          featured: boolean
          hours: Json
          id: string
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          name: string
          phone: string
          photos: string[]
          plan: string
          postal_code: string
          search_doc: unknown
          slug: string
          status: string
          tags: string[]
          updated_at: string
          verified: boolean
          website: string
        }
        Insert: {
          address?: string
          category_id?: string | null
          city?: string
          claim_requested_at?: string | null
          claim_requested_by?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          departement?: string | null
          description?: string
          email?: string
          excerpt?: string
          featured?: boolean
          hours?: Json
          id?: string
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name: string
          phone?: string
          photos?: string[]
          plan?: string
          postal_code?: string
          search_doc?: unknown
          slug: string
          status?: string
          tags?: string[]
          updated_at?: string
          verified?: boolean
          website?: string
        }
        Update: {
          address?: string
          category_id?: string | null
          city?: string
          claim_requested_at?: string | null
          claim_requested_by?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          departement?: string | null
          description?: string
          email?: string
          excerpt?: string
          featured?: boolean
          hours?: Json
          id?: string
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string
          phone?: string
          photos?: string[]
          plan?: string
          postal_code?: string
          search_doc?: unknown
          slug?: string
          status?: string
          tags?: string[]
          updated_at?: string
          verified?: boolean
          website?: string
        }
        Relationships: [
          {
            foreignKeyName: "directory_listings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "directory_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directory_listings_departement_fkey"
            columns: ["departement"]
            isOneToOne: false
            referencedRelation: "geo_departements"
            referencedColumns: ["code"]
          },
        ]
      }
      directory_reviews: {
        Row: {
          approved: boolean
          author_id: string
          author_name: string
          content: string
          created_at: string
          id: string
          listing_id: string
          moderated_at: string | null
          moderated_by: string | null
          moderation_note: string | null
          rating: number
        }
        Insert: {
          approved?: boolean
          author_id: string
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          listing_id: string
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_note?: string | null
          rating: number
        }
        Update: {
          approved?: boolean
          author_id?: string
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          listing_id?: string
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_note?: string | null
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "directory_reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "directory_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      etiquettes: {
        Row: {
          created_at: string
          definition: string
          id: string
          libelle: string
          slug: string
        }
        Insert: {
          created_at?: string
          definition?: string
          id?: string
          libelle: string
          slug?: string
        }
        Update: {
          created_at?: string
          definition?: string
          id?: string
          libelle?: string
          slug?: string
        }
        Relationships: []
      }
      faq_items: {
        Row: {
          answer: string
          category: string
          created_at: string
          id: string
          position: number
          published: boolean
          question: string
          search_doc: unknown
          updated_at: string
        }
        Insert: {
          answer: string
          category?: string
          created_at?: string
          id?: string
          position?: number
          published?: boolean
          question: string
          search_doc?: unknown
          updated_at?: string
        }
        Update: {
          answer?: string
          category?: string
          created_at?: string
          id?: string
          position?: number
          published?: boolean
          question?: string
          search_doc?: unknown
          updated_at?: string
        }
        Relationships: []
      }
      forum_categories: {
        Row: {
          color: string
          created_at: string
          description: string
          id: string
          name: string
          position: number
          slug: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string
          id?: string
          name: string
          position?: number
          slug: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string
          id?: string
          name?: string
          position?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      forum_follows: {
        Row: {
          created_at: string
          id: string
          topic_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          topic_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          topic_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_follows_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "forum_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_likes: {
        Row: {
          created_at: string
          id: string
          reply_id: string | null
          topic_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reply_id?: string | null
          topic_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reply_id?: string | null
          topic_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_likes_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "forum_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_likes_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "forum_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_replies: {
        Row: {
          accepted: boolean
          author_id: string
          author_name: string
          content: string
          created_at: string
          id: string
          moderated_at: string | null
          moderated_by: string | null
          moderation_note: string | null
          topic_id: string
        }
        Insert: {
          accepted?: boolean
          author_id: string
          author_name?: string
          content: string
          created_at?: string
          id?: string
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_note?: string | null
          topic_id: string
        }
        Update: {
          accepted?: boolean
          author_id?: string
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_note?: string | null
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_replies_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "forum_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_topics: {
        Row: {
          author_id: string
          author_name: string
          category_id: string | null
          content: string
          created_at: string
          id: string
          last_activity_at: string
          locked: boolean
          moderated_at: string | null
          moderated_by: string | null
          moderation_note: string | null
          search_doc: unknown
          title: string
          updated_at: string
          views: number
        }
        Insert: {
          author_id: string
          author_name?: string
          category_id?: string | null
          content: string
          created_at?: string
          id?: string
          last_activity_at?: string
          locked?: boolean
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_note?: string | null
          search_doc?: unknown
          title: string
          updated_at?: string
          views?: number
        }
        Update: {
          author_id?: string
          author_name?: string
          category_id?: string | null
          content?: string
          created_at?: string
          id?: string
          last_activity_at?: string
          locked?: boolean
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_note?: string | null
          search_doc?: unknown
          title?: string
          updated_at?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "forum_topics_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "forum_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      geo_adjacency: {
        Row: {
          created_at: string
          distance_km: number | null
          id: string
          neighbor_id: string
          place_id: string
        }
        Insert: {
          created_at?: string
          distance_km?: number | null
          id?: string
          neighbor_id: string
          place_id: string
        }
        Update: {
          created_at?: string
          distance_km?: number | null
          id?: string
          neighbor_id?: string
          place_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "geo_adjacency_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "geo_places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geo_adjacency_neighbor_id_fkey"
            columns: ["neighbor_id"]
            isOneToOne: false
            referencedRelation: "geo_places"
            referencedColumns: ["id"]
          },
        ]
      }
      geo_departements: {
        Row: {
          code: string
          created_at: string
          nom: string
          population: number
          region: string
          slug: string
        }
        Insert: {
          code: string
          created_at?: string
          nom: string
          population?: number
          region?: string
          slug: string
        }
        Update: {
          code?: string
          created_at?: string
          nom?: string
          population?: number
          region?: string
          slug?: string
        }
        Relationships: []
      }
      geo_places: {
        Row: {
          attributes: Json
          code: string
          country_code: string
          created_at: string
          epci_code: string | null
          id: string
          kind: string
          latitude: number | null
          longitude: number | null
          name: string
          parent_code: string | null
          parent_id: string | null
          population: number | null
          postal_codes: string[]
          slug: string
          source: string
          updated_at: string
        }
        Insert: {
          attributes?: Json
          code: string
          country_code?: string
          created_at?: string
          epci_code?: string | null
          id?: string
          kind: string
          latitude?: number | null
          longitude?: number | null
          name: string
          parent_code?: string | null
          parent_id?: string | null
          population?: number | null
          postal_codes?: string[]
          slug: string
          source?: string
          updated_at?: string
        }
        Update: {
          attributes?: Json
          code?: string
          country_code?: string
          created_at?: string
          epci_code?: string | null
          id?: string
          kind?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          parent_code?: string | null
          parent_id?: string | null
          population?: number | null
          postal_codes?: string[]
          slug?: string
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "geo_places_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "geo_places"
            referencedColumns: ["id"]
          },
        ]
      }
      liens_sources_etat: {
        Row: {
          code_http: number | null
          erreur: string
          ok: boolean
          url: string
          verifie_le: string
        }
        Insert: {
          code_http?: number | null
          erreur?: string
          ok: boolean
          url: string
          verifie_le?: string
        }
        Update: {
          code_http?: number | null
          erreur?: string
          ok?: boolean
          url?: string
          verifie_le?: string
        }
        Relationships: []
      }
      lms_courses: {
        Row: {
          cover_url: string | null
          created_at: string
          currency: string
          description: string
          duration_minutes: number
          excerpt: string
          id: string
          level: string
          position: number
          price_cents: number
          published: boolean
          search_doc: unknown
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          currency?: string
          description?: string
          duration_minutes?: number
          excerpt?: string
          id?: string
          level?: string
          position?: number
          price_cents?: number
          published?: boolean
          search_doc?: unknown
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          currency?: string
          description?: string
          duration_minutes?: number
          excerpt?: string
          id?: string
          level?: string
          position?: number
          price_cents?: number
          published?: boolean
          search_doc?: unknown
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      lms_enrollments: {
        Row: {
          course_id: string
          enrolled_at: string
          id: string
          paid_at: string | null
          user_id: string
        }
        Insert: {
          course_id: string
          enrolled_at?: string
          id?: string
          paid_at?: string | null
          user_id: string
        }
        Update: {
          course_id?: string
          enrolled_at?: string
          id?: string
          paid_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "lms_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_lessons: {
        Row: {
          content: string
          content_type: string
          created_at: string
          duration_minutes: number
          free_preview: boolean
          id: string
          module_id: string
          position: number
          title: string
          video_url: string | null
        }
        Insert: {
          content?: string
          content_type?: string
          created_at?: string
          duration_minutes?: number
          free_preview?: boolean
          id?: string
          module_id: string
          position?: number
          title: string
          video_url?: string | null
        }
        Update: {
          content?: string
          content_type?: string
          created_at?: string
          duration_minutes?: number
          free_preview?: boolean
          id?: string
          module_id?: string
          position?: number
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lms_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "lms_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_modules: {
        Row: {
          course_id: string
          created_at: string
          id: string
          position: number
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          position?: number
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          position?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "lms_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          lesson_id: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lms_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_categories: {
        Row: {
          created_at: string
          icon: string
          id: string
          name: string
          position: number
          slug: string
        }
        Insert: {
          created_at?: string
          icon?: string
          id?: string
          name: string
          position?: number
          slug: string
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          name?: string
          position?: number
          slug?: string
        }
        Relationships: []
      }
      marketplace_listings: {
        Row: {
          approved: boolean
          category_id: string | null
          city: string
          created_at: string
          currency: string
          departement: string | null
          description: string
          id: string
          negotiable: boolean
          photos: string[]
          price_cents: number
          search_doc: unknown
          seller_id: string
          seller_name: string
          slug: string
          status: string
          tags: string[]
          title: string
          updated_at: string
          views: number
        }
        Insert: {
          approved?: boolean
          category_id?: string | null
          city?: string
          created_at?: string
          currency?: string
          departement?: string | null
          description?: string
          id?: string
          negotiable?: boolean
          photos?: string[]
          price_cents?: number
          search_doc?: unknown
          seller_id: string
          seller_name?: string
          slug: string
          status?: string
          tags?: string[]
          title: string
          updated_at?: string
          views?: number
        }
        Update: {
          approved?: boolean
          category_id?: string | null
          city?: string
          created_at?: string
          currency?: string
          departement?: string | null
          description?: string
          id?: string
          negotiable?: boolean
          photos?: string[]
          price_cents?: number
          search_doc?: unknown
          seller_id?: string
          seller_name?: string
          slug?: string
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_listings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "marketplace_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_listings_departement_fkey"
            columns: ["departement"]
            isOneToOne: false
            referencedRelation: "geo_departements"
            referencedColumns: ["code"]
          },
        ]
      }
      masterplan_sections: {
        Row: {
          content: string
          created_at: string
          id: string
          position: number
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          position?: number
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          position?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      media_files: {
        Row: {
          alt: string
          created_at: string
          created_by: string | null
          height: number | null
          id: string
          mime_type: string
          name: string
          path: string
          size_bytes: number
          updated_at: string
          width: number | null
        }
        Insert: {
          alt?: string
          created_at?: string
          created_by?: string | null
          height?: number | null
          id?: string
          mime_type: string
          name?: string
          path: string
          size_bytes?: number
          updated_at?: string
          width?: number | null
        }
        Update: {
          alt?: string
          created_at?: string
          created_by?: string | null
          height?: number | null
          id?: string
          mime_type?: string
          name?: string
          path?: string
          size_bytes?: number
          updated_at?: string
          width?: number | null
        }
        Relationships: []
      }
      member_profiles: {
        Row: {
          accepts_messages: boolean
          avatar_url: string | null
          bio: string
          created_at: string
          display_name: string
          job_title: string
          listed: boolean
          search_doc: unknown
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          accepts_messages?: boolean
          avatar_url?: string | null
          bio?: string
          created_at?: string
          display_name?: string
          job_title?: string
          listed?: boolean
          search_doc?: unknown
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          accepts_messages?: boolean
          avatar_url?: string | null
          bio?: string
          created_at?: string
          display_name?: string
          job_title?: string
          listed?: boolean
          search_doc?: unknown
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          consent_at: string
          created_at: string
          email: string
          first_name: string | null
          id: string
          source: string
          unsubscribed_at: string | null
        }
        Insert: {
          consent_at?: string
          created_at?: string
          email: string
          first_name?: string | null
          id?: string
          source?: string
          unsubscribed_at?: string | null
        }
        Update: {
          consent_at?: string
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          source?: string
          unsubscribed_at?: string | null
        }
        Relationships: []
      }
      pages: {
        Row: {
          created_at: string
          data: Json
          description: string
          id: string
          is_home: boolean
          published: boolean
          published_at: string | null
          search_doc: unknown
          slug: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          data?: Json
          description?: string
          id?: string
          is_home?: boolean
          published?: boolean
          published_at?: string | null
          search_doc?: unknown
          slug: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          data?: Json
          description?: string
          id?: string
          is_home?: boolean
          published?: boolean
          published_at?: string | null
          search_doc?: unknown
          slug?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_cents: number
          course_id: string | null
          created_at: string
          currency: string
          id: string
          order_id: string | null
          paid_at: string | null
          product_label: string
          refunded_at: string | null
          status: string
          stripe_payment_intent: string | null
          stripe_session_id: string | null
          user_id: string
          waiver_accepted_at: string | null
        }
        Insert: {
          amount_cents: number
          course_id?: string | null
          created_at?: string
          currency: string
          id?: string
          order_id?: string | null
          paid_at?: string | null
          product_label: string
          refunded_at?: string | null
          status?: string
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          user_id: string
          waiver_accepted_at?: string | null
        }
        Update: {
          amount_cents?: number
          course_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          order_id?: string | null
          paid_at?: string | null
          product_label?: string
          refunded_at?: string | null
          status?: string
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          user_id?: string
          waiver_accepted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "lms_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "shop_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      premier_administrateur: {
        Row: {
          promu_le: string
          user_id: string | null
          verrou: boolean
        }
        Insert: {
          promu_le?: string
          user_id?: string | null
          verrou?: boolean
        }
        Update: {
          promu_le?: string
          user_id?: string | null
          verrou?: boolean
        }
        Relationships: []
      }
      pricing_plans: {
        Row: {
          active: boolean
          created_at: string
          cta_label: string
          currency: string
          features: Json
          highlighted: boolean
          id: string
          name: string
          period: string
          position: number
          price_cents: number
          tagline: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          cta_label?: string
          currency?: string
          features?: Json
          highlighted?: boolean
          id?: string
          name: string
          period?: string
          position?: number
          price_cents?: number
          tagline?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          cta_label?: string
          currency?: string
          features?: Json
          highlighted?: boolean
          id?: string
          name?: string
          period?: string
          position?: number
          price_cents?: number
          tagline?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      recherches_sans_resultat: {
        Row: {
          derniere: string
          nombre: number
          premiere: string
          terme: string
        }
        Insert: {
          derniere?: string
          nombre?: number
          premiere?: string
          terme: string
        }
        Update: {
          derniere?: string
          nombre?: number
          premiere?: string
          terme?: string
        }
        Relationships: []
      }
      redirections: {
        Row: {
          created_at: string
          de: string
          vers: string
        }
        Insert: {
          created_at?: string
          de: string
          vers: string
        }
        Update: {
          created_at?: string
          de?: string
          vers?: string
        }
        Relationships: []
      }
      references_contenu: {
        Row: {
          annee: number | null
          auteurs: string
          contenu_id: string
          created_at: string
          doi: string
          id: string
          pmid: string
          rang: number
          revue: string
          titre: string
          url: string
        }
        Insert: {
          annee?: number | null
          auteurs?: string
          contenu_id: string
          created_at?: string
          doi?: string
          id?: string
          pmid?: string
          rang: number
          revue?: string
          titre: string
          url?: string
        }
        Update: {
          annee?: number | null
          auteurs?: string
          contenu_id?: string
          created_at?: string
          doi?: string
          id?: string
          pmid?: string
          rang?: number
          revue?: string
          titre?: string
          url?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          admin_note: string | null
          contact_email: string | null
          content_id: string | null
          content_type: string
          created_at: string
          details: string | null
          handled_at: string | null
          handled_by: string | null
          id: string
          proposed_value: string | null
          public_note: string | null
          reason: string
          reported_url: string | null
          reporter_id: string | null
          source: string
          status: string
          tracking_code: string | null
        }
        Insert: {
          admin_note?: string | null
          contact_email?: string | null
          content_id?: string | null
          content_type: string
          created_at?: string
          details?: string | null
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          proposed_value?: string | null
          public_note?: string | null
          reason: string
          reported_url?: string | null
          reporter_id?: string | null
          source?: string
          status?: string
          tracking_code?: string | null
        }
        Update: {
          admin_note?: string | null
          contact_email?: string | null
          content_id?: string | null
          content_type?: string
          created_at?: string
          details?: string | null
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          proposed_value?: string | null
          public_note?: string | null
          reason?: string
          reported_url?: string | null
          reporter_id?: string | null
          source?: string
          status?: string
          tracking_code?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          approved: boolean
          author_id: string
          author_name: string
          content: string
          created_at: string
          id: string
          moderated_at: string | null
          moderated_by: string | null
          moderation_note: string | null
          rating: number
          title: string
        }
        Insert: {
          approved?: boolean
          author_id: string
          author_name?: string
          content: string
          created_at?: string
          id?: string
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_note?: string | null
          rating: number
          title?: string
        }
        Update: {
          approved?: boolean
          author_id?: string
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_note?: string | null
          rating?: number
          title?: string
        }
        Relationships: []
      }
      roadmap_items: {
        Row: {
          created_at: string
          description: string
          id: string
          lot: string
          position: number
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          lot?: string
          position?: number
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          lot?: string
          position?: number
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      rubriques: {
        Row: {
          created_at: string
          id: string
          intro: string
          libelle: string
          ordre: number
          parent_id: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          intro?: string
          libelle: string
          ordre?: number
          parent_id?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          intro?: string
          libelle?: string
          ordre?: number
          parent_id?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      series: {
        Row: {
          created_at: string
          description: string
          id: string
          slug: string
          titre: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          slug: string
          titre: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          slug?: string
          titre?: string
        }
        Relationships: []
      }
      shop_order_items: {
        Row: {
          downloads: number
          id: string
          kind: string
          order_id: string
          product_id: string | null
          quantity: number
          reserved_quantity: number
          title: string
          unit_price_cents: number
        }
        Insert: {
          downloads?: number
          id?: string
          kind: string
          order_id: string
          product_id?: string | null
          quantity: number
          reserved_quantity?: number
          title: string
          unit_price_cents: number
        }
        Update: {
          downloads?: number
          id?: string
          kind?: string
          order_id?: string
          product_id?: string | null
          quantity?: number
          reserved_quantity?: number
          title?: string
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "shop_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "shop_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_orders: {
        Row: {
          admin_note: string | null
          carrier: string | null
          created_at: string
          currency: string
          delivered_at: string | null
          email: string | null
          has_digital: boolean
          has_physical: boolean
          id: string
          number: number
          paid_at: string | null
          refunded_at: string | null
          shipped_at: string | null
          shipping_address: Json | null
          shipping_cents: number
          shipping_name: string | null
          status: string
          subtotal_cents: number
          total_cents: number
          tracking_number: string | null
          user_id: string
          waiver_accepted_at: string | null
        }
        Insert: {
          admin_note?: string | null
          carrier?: string | null
          created_at?: string
          currency?: string
          delivered_at?: string | null
          email?: string | null
          has_digital?: boolean
          has_physical?: boolean
          id?: string
          number?: number
          paid_at?: string | null
          refunded_at?: string | null
          shipped_at?: string | null
          shipping_address?: Json | null
          shipping_cents?: number
          shipping_name?: string | null
          status?: string
          subtotal_cents: number
          total_cents: number
          tracking_number?: string | null
          user_id: string
          waiver_accepted_at?: string | null
        }
        Update: {
          admin_note?: string | null
          carrier?: string | null
          created_at?: string
          currency?: string
          delivered_at?: string | null
          email?: string | null
          has_digital?: boolean
          has_physical?: boolean
          id?: string
          number?: number
          paid_at?: string | null
          refunded_at?: string | null
          shipped_at?: string | null
          shipping_address?: Json | null
          shipping_cents?: number
          shipping_name?: string | null
          status?: string
          subtotal_cents?: number
          total_cents?: number
          tracking_number?: string | null
          user_id?: string
          waiver_accepted_at?: string | null
        }
        Relationships: []
      }
      shop_product_files: {
        Row: {
          file_name: string
          path: string
          product_id: string
          size_bytes: number | null
          updated_at: string
        }
        Insert: {
          file_name: string
          path: string
          product_id: string
          size_bytes?: number | null
          updated_at?: string
        }
        Update: {
          file_name?: string
          path?: string
          product_id?: string
          size_bytes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_product_files_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_products: {
        Row: {
          created_at: string
          currency: string
          description: string
          id: string
          image_url: string | null
          kind: string
          position: number
          price_cents: number
          published: boolean
          slug: string
          stock: number | null
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string
          id?: string
          image_url?: string | null
          kind?: string
          position?: number
          price_cents?: number
          published?: boolean
          slug: string
          stock?: number | null
          summary?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string
          id?: string
          image_url?: string | null
          kind?: string
          position?: number
          price_cents?: number
          published?: boolean
          slug?: string
          stock?: number | null
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      socle_installation: {
        Row: {
          cree_le: string
          detail: string | null
          id: string
          installe_le: string
          migration_reference: string | null
          niveau: string
          resume: string
          version: string
        }
        Insert: {
          cree_le?: string
          detail?: string | null
          id?: string
          installe_le: string
          migration_reference?: string | null
          niveau: string
          resume: string
          version: string
        }
        Update: {
          cree_le?: string
          detail?: string | null
          id?: string
          installe_le?: string
          migration_reference?: string | null
          niveau?: string
          resume?: string
          version?: string
        }
        Relationships: []
      }
      socle_versions: {
        Row: {
          cree_le: string
          detail: string | null
          id: string
          migration_reference: string
          niveau: string
          publie_le: string
          resume: string
          version: string
        }
        Insert: {
          cree_le?: string
          detail?: string | null
          id?: string
          migration_reference: string
          niveau: string
          publie_le?: string
          resume: string
          version: string
        }
        Update: {
          cree_le?: string
          detail?: string | null
          id?: string
          migration_reference?: string
          niveau?: string
          publie_le?: string
          resume?: string
          version?: string
        }
        Relationships: []
      }
      studio_admins: {
        Row: {
          created_at: string
          email: string
        }
        Insert: {
          created_at?: string
          email: string
        }
        Update: {
          created_at?: string
          email?: string
        }
        Relationships: []
      }
      synonymes: {
        Row: {
          created_at: string
          id: string
          terme: string
          variantes: string[]
        }
        Insert: {
          created_at?: string
          id?: string
          terme: string
          variantes?: string[]
        }
        Update: {
          created_at?: string
          id?: string
          terme?: string
          variantes?: string[]
        }
        Relationships: []
      }
      template_checks: {
        Row: {
          area: string
          code: string
          created_at: string
          evidence: string
          id: string
          label: string
          modules: string[]
          position: number
          requirement: string
          severity: string
          status: string
          updated_at: string
        }
        Insert: {
          area: string
          code: string
          created_at?: string
          evidence?: string
          id?: string
          label: string
          modules?: string[]
          position?: number
          requirement?: string
          severity?: string
          status?: string
          updated_at?: string
        }
        Update: {
          area?: string
          code?: string
          created_at?: string
          evidence?: string
          id?: string
          label?: string
          modules?: string[]
          position?: number
          requirement?: string
          severity?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      termes_interdits_publics: {
        Row: {
          categorie: string
          created_at: string
          created_by: string | null
          id: string
          terme: string
        }
        Insert: {
          categorie?: string
          created_at?: string
          created_by?: string | null
          id?: string
          terme: string
        }
        Update: {
          categorie?: string
          created_at?: string
          created_by?: string | null
          id?: string
          terme?: string
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          approved: boolean
          author_id: string | null
          author_name: string
          avatar_url: string | null
          company: string
          content: string
          created_at: string
          featured: boolean
          id: string
          moderated_at: string | null
          moderated_by: string | null
          moderation_note: string | null
          outcome: string
          position: number
          role_title: string
          updated_at: string
        }
        Insert: {
          approved?: boolean
          author_id?: string | null
          author_name: string
          avatar_url?: string | null
          company?: string
          content: string
          created_at?: string
          featured?: boolean
          id?: string
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_note?: string | null
          outcome?: string
          position?: number
          role_title?: string
          updated_at?: string
        }
        Update: {
          approved?: boolean
          author_id?: string | null
          author_name?: string
          avatar_url?: string | null
          company?: string
          content?: string
          created_at?: string
          featured?: boolean
          id?: string
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_note?: string | null
          outcome?: string
          position?: number
          role_title?: string
          updated_at?: string
        }
        Relationships: []
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
      ad_campaign_is_live: { Args: { _campaign_id: string }; Returns: boolean }
      admin_list_users: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string
          id: string
          is_admin: boolean
          is_studio_admin: boolean
          last_sign_in_at: string
        }[]
      }
      admin_set_admin: {
        Args: { _admin: boolean; _user_id: string }
        Returns: undefined
      }
      admin_set_editor: { Args: { _editor: boolean; _user_id: string }; Returns: undefined }
      ancre_pauvre: { Args: { _ancre: string }; Returns: boolean }
      bootstrap_current_user: {
        Args: { _full_name?: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      can_access_lesson: {
        Args: { _lesson_id: string; _user_id: string }
        Returns: boolean
      }
      can_write_content: { Args: { _user_id: string }; Returns: boolean }
      changer_statut_contenu: {
        Args: { _id: string; _motif?: string; _publie_le?: string; _vers: string }
        Returns: undefined
      }
      contenus_publics_a_revoir: {
        Args: never
        Returns: {
          id: string
          slug: string
          termes: string[]
          titre: string
          type: string
        }[]
      }
      delete_my_account: { Args: never; Returns: undefined }
      directory_departement_counts: {
        Args: never
        Returns: {
          departement: string
          listings: number
        }[]
      }
      directory_listing_modifiable: { Args: { _id: string }; Returns: boolean }
      directory_listing_visible: { Args: { _id: string }; Returns: boolean }
      editorial_defaults: { Args: never; Returns: Json }
      editorial_etat: {
        Args: never
        Returns: {
          codes: string[]
          id: string
          manques: string[]
          statut_lu: string
        }[]
      }
      editorial_reglages: { Args: never; Returns: Json }
      en_perimetre: {
        Args: { "": Database["public"]["Tables"]["template_checks"]["Row"] }
        Returns: boolean
      }
      enregistrer_liens_sources: { Args: { _etats: Json }; Returns: number }
      extraire_liens: {
        Args: { _corps: string }
        Returns: {
          ancre: string
          chemin: string
          rang: number
        }[]
      }
      forum_author_name: { Args: { _user_id: string }; Returns: string }
      forum_category_counts: {
        Args: never
        Returns: {
          category_id: string | null
          likes: number
          replies: number
          topics: number
        }[]
      }
      forum_reply_like_counts: {
        Args: { _topic_id: string }
        Returns: {
          likes: number
          reply_id: string
        }[]
      }
      forum_top_members: {
        Args: { _since?: string }
        Returns: {
          display_name: string
          likes: number
          replies: number
          score: number
          topics: number
          user_id: string
        }[]
      }
      forum_topic_counts: {
        Args: { _topic_ids: string[] }
        Returns: {
          likes: number
          replies: number
          topic_id: string
        }[]
      }
      geo_communes_principales: {
        Args: { _departement: string; _limit?: number; _pays?: string }
        Returns: { code: string; name: string; population: number | null }[]
      }
      geo_compute_neighbours: {
        Args: { _departement?: string | null; _rayon_km?: number; _max?: number; _limit?: number }
        Returns: number
      }
      geo_distance_km: {
        Args: { _lat1: number; _lat2: number; _lon1: number; _lon2: number }
        Returns: number
      }
      geo_importer: { Args: { _lignes: Json }; Returns: number }
      geo_lieu: {
        Args: { _kind: string; _code: string; _pays?: string }
        Returns: {
          kind: string
          code: string
          name: string
          slug: string
          parent_code: string | null
          epci_code: string | null
          postal_codes: string[]
          population: number | null
          latitude: number | null
          longitude: number | null
        }[]
      }
      geo_neighbours: {
        Args: { _code: string; _limit?: number }
        Returns: { code: string; name: string; population: number | null; distance_km: number | null }[]
      }
      geo_search: {
        Args: { _q: string; _kinds?: string[] | null; _limit?: number }
        Returns: {
          kind: string
          code: string
          name: string
          parent_code: string | null
          postal_codes: string[]
          population: number | null
        }[]
      }
      geo_status: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_listing_views: {
        Args: { _listing_id: string }
        Returns: undefined
      }
      increment_topic_views: { Args: { _topic_id: string }; Returns: undefined }
      is_conversation_participant: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      lire_ensuite: {
        Args: { _id: string; _n?: number }
        Returns: {
          chapo: string
          id: string
          publie_le: string
          slug: string
          titre: string
        }[]
      }
      lms_course_learners: {
        Args: never
        Returns: {
          course_id: string
          learners: number
        }[]
      }
      lms_lesson_content: {
        Args: { _lesson_id: string }
        Returns: {
          content: string
          video_url: string
        }[]
      }
      maillage_etat: {
        Args: never
        Returns: {
          ancres_pauvres: string[]
          entrants: number
          id: string
          liens_casses: string[]
          liens_rediriges: string[]
          orphelin: boolean
          requete_en_double: string[]
          satellites_absents: string[]
          sortants: number
        }[]
      }
      manques_publication: {
        Args: { _id: string }
        Returns: {
          code: string
          message: string
        }[]
      }
      member_accepts_messages: { Args: { _user_id: string }; Returns: boolean }
      module_defaults: { Args: never; Returns: Json }
      module_enabled: { Args: { _key: string }; Returns: boolean }
      module_greffe_values: { Args: { _value: Json }; Returns: Json }
      module_is_greffe: { Args: { _key: string }; Returns: boolean }
      module_socle_keys: { Args: never; Returns: string[] }
      newsletter_known_source: { Args: { _source: string }; Returns: string }
      newsletter_subscribe: {
        Args: { _email: string; _first_name?: string; _source?: string }
        Returns: undefined
      }
      payment_attach_session: {
        Args: { _payment_id: string; _session_id: string }
        Returns: undefined
      }
      payment_mark_paid: {
        Args: {
          _amount: number
          _currency: string
          _intent: string
          _session_id: string
        }
        Returns: boolean
      }
      payment_mark_refunded: { Args: { _intent: string }; Returns: boolean }
      payment_mark_status: {
        Args: { _session_id: string; _status: string }
        Returns: boolean
      }
      payment_start_course: {
        Args: { _course_id: string; _user_id: string; _waiver: boolean }
        Returns: {
          amount_cents: number
          course_slug: string
          currency: string
          id: string
          product_label: string
          superseded_sessions: string[]
        }[]
      }
      purge_contact_messages: { Args: never; Returns: number }
      purge_report_contacts: { Args: never; Returns: number }
      recette_purge: { Args: { _membre?: string }; Returns: Json }
      recherche_articles: {
        Args: {
          _decalage?: number
          _depuis?: string
          _etiquette?: string
          _limite?: number
          _q: string
          _rubrique?: string
          _serie?: string
        }
        Returns: {
          chapo: string
          etiquettes: string[]
          extrait: string
          id: string
          publie_le: string
          rang: number
          slug: string
          titre: string
          total: number
        }[]
      }
      recherche_articles_facettes: {
        Args: { _q: string }
        Returns: {
          cle: string
          facette: string
          libelle: string
          nombre: number
        }[]
      }
      report_improvements: {
        Args: { _limit?: number }
        Returns: {
          content_type: string
          handled_at: string
          id: string
          public_note: string
          reason: string
          reported_url: string
        }[]
      }
      report_status: {
        Args: { _code: string }
        Returns: {
          created_at: string
          handled_at: string
          public_note: string
          reason: string
          status: string
        }[]
      }
      report_submit: {
        Args: {
          _contact_email?: string
          _content_id?: string
          _content_type: string
          _details?: string
          _proposed_value?: string
          _reason: string
          _reported_url?: string
          _trap?: string
        }
        Returns: string
      }
      request_directory_claim: {
        Args: { _listing_id: string }
        Returns: boolean
      }
      search_excerpt: { Args: { _t: string }; Returns: string }
      search_query: { Args: { _q: string }; Returns: unknown }
      search_site: {
        Args: { _limit?: number; _q: string }
        Returns: {
          excerpt: string
          kind: string
          rank: number
          title: string
          updated_at: string
          url: string
        }[]
      }
      search_tags: { Args: { _tags: string[] }; Returns: string }
      shop_download: {
        Args: { _item_id: string; _user_id: string }
        Returns: {
          downloads: number
          file_name: string
          path: string
        }[]
      }
      shop_release_stock: { Args: { _order_id: string }; Returns: boolean }
      shop_set_customer: {
        Args: { _address: Json; _email: string; _name: string; _session_id: string }
        Returns: boolean
      }
      shop_start_checkout: {
        Args: { _items: Json; _user_id: string; _waiver: boolean }
        Returns: {
          countries: string[]
          currency: string
          lines: Json
          order_id: string
          order_number: number
          payment_id: string
          shipping_cents: number
          superseded_sessions: string[]
          total_cents: number
        }[]
      }
      slug_depuis: { Args: { _t: string }; Returns: string }
      sources_a_verifier: {
        Args: never
        Returns: {
          contenus: string[]
          url: string
          verifie_le: string
        }[]
      }
      sources_valides: { Args: { _sources: string }; Returns: boolean }
      starter_reset_demo: { Args: { _scope: string }; Returns: Json }
      starter_status: { Args: never; Returns: Json }
      statut_effectif: {
        Args: { _publie_le: string; _relu_le: string; _statut: string; _type: string }
        Returns: string
      }
      suggestion_recherche: { Args: { _q: string }; Returns: string }
      tables_sans_protection: { Args: never; Returns: string[] }
      valid_page_data: { Args: { _data: Json }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user" | "editor"
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
      app_role: ["admin", "user", "editor"],
    },
  },
} as const
