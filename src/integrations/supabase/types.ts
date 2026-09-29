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
          moderated_at: string | null
          moderated_by: string | null
          moderation_note: string | null
          approved: boolean
          author_id: string
          author_name: string
          content: string
          created_at: string
          id: string
          post_id: string
        }
        Insert: {
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_note?: string | null
          approved?: boolean
          author_id: string
          author_name?: string
          content: string
          created_at?: string
          id?: string
          post_id: string
        }
        Update: {
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_note?: string | null
          approved?: boolean
          author_id?: string
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_id: string | null
          content: string
          cover_url: string | null
          created_at: string
          excerpt: string
          id: string
          published: boolean
          published_at: string | null
          slug: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          content?: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string
          id?: string
          published?: boolean
          published_at?: string | null
          slug: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          content?: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string
          id?: string
          published?: boolean
          published_at?: string | null
          slug?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
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
          moderated_at: string | null
          moderated_by: string | null
          moderation_note: string | null
          approved: boolean
          author_id: string
          author_name: string
          content: string
          created_at: string
          id: string
          listing_id: string
          rating: number
        }
        Insert: {
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_note?: string | null
          approved?: boolean
          author_id: string
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          listing_id: string
          rating: number
        }
        Update: {
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_note?: string | null
          approved?: boolean
          author_id?: string
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          listing_id?: string
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
      faq_items: {
        Row: {
          answer: string
          category: string
          created_at: string
          id: string
          position: number
          published: boolean
          question: string
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
          moderated_at: string | null
          moderated_by: string | null
          moderation_note: string | null
          accepted: boolean
          author_id: string
          author_name: string
          content: string
          created_at: string
          id: string
          topic_id: string
        }
        Insert: {
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_note?: string | null
          accepted?: boolean
          author_id: string
          author_name?: string
          content: string
          created_at?: string
          id?: string
          topic_id: string
        }
        Update: {
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_note?: string | null
          accepted?: boolean
          author_id?: string
          author_name?: string
          content?: string
          created_at?: string
          id?: string
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
          moderated_at: string | null
          moderated_by: string | null
          moderation_note: string | null
          author_id: string
          author_name: string
          category_id: string | null
          content: string
          created_at: string
          id: string
          last_activity_at: string
          locked: boolean
          title: string
          updated_at: string
          views: number
        }
        Insert: {
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_note?: string | null
          author_id: string
          author_name?: string
          category_id?: string | null
          content: string
          created_at?: string
          id?: string
          last_activity_at?: string
          locked?: boolean
          title: string
          updated_at?: string
          views?: number
        }
        Update: {
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_note?: string | null
          author_id?: string
          author_name?: string
          category_id?: string | null
          content?: string
          created_at?: string
          id?: string
          last_activity_at?: string
          locked?: boolean
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
      geo_communes: {
        Row: {
          code_insee: string
          code_postal: string
          created_at: string
          departement: string
          latitude: number | null
          longitude: number | null
          nom: string
          population: number
          slug: string
        }
        Insert: {
          code_insee: string
          code_postal?: string
          created_at?: string
          departement: string
          latitude?: number | null
          longitude?: number | null
          nom: string
          population?: number
          slug: string
        }
        Update: {
          code_insee?: string
          code_postal?: string
          created_at?: string
          departement?: string
          latitude?: number | null
          longitude?: number | null
          nom?: string
          population?: number
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "geo_communes_departement_fkey"
            columns: ["departement"]
            isOneToOne: false
            referencedRelation: "geo_departements"
            referencedColumns: ["code"]
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
          paid_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          course_id: string
          enrolled_at?: string
          paid_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          course_id?: string
          enrolled_at?: string
          paid_at?: string | null
          id?: string
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
      payments: {
        Row: {
          amount_cents: number
          course_id: string | null
          created_at: string
          currency: string
          id: string
          paid_at: string | null
          product_label: string
          refunded_at: string | null
          status: string
          stripe_payment_intent: string | null
          stripe_session_id: string | null
          user_id: string
          waiver_accepted_at: string
        }
        Insert: {
          amount_cents: number
          course_id?: string | null
          created_at?: string
          currency: string
          id?: string
          paid_at?: string | null
          product_label: string
          refunded_at?: string | null
          status?: string
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          user_id: string
          waiver_accepted_at: string
        }
        Update: {
          amount_cents?: number
          course_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          paid_at?: string | null
          product_label?: string
          refunded_at?: string | null
          status?: string
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          user_id?: string
          waiver_accepted_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          admin_note: string | null
          content_id: string | null
          content_type: string
          created_at: string
          details: string | null
          handled_at: string | null
          handled_by: string | null
          id: string
          reason: string
          reported_url: string | null
          reporter_id: string
          status: string
        }
        Insert: {
          admin_note?: string | null
          content_id?: string | null
          content_type: string
          created_at?: string
          details?: string | null
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          reason: string
          reported_url?: string | null
          reporter_id: string
          status?: string
        }
        Update: {
          admin_note?: string | null
          content_id?: string | null
          content_type?: string
          created_at?: string
          details?: string | null
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          reason?: string
          reported_url?: string | null
          reporter_id?: string
          status?: string
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
          slug?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
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
      reviews: {
        Row: {
          moderated_at: string | null
          moderated_by: string | null
          moderation_note: string | null
          approved: boolean
          author_id: string
          author_name: string
          content: string
          created_at: string
          id: string
          rating: number
          title: string
        }
        Insert: {
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_note?: string | null
          approved?: boolean
          author_id: string
          author_name?: string
          content: string
          created_at?: string
          id?: string
          rating: number
          title?: string
        }
        Update: {
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_note?: string | null
          approved?: boolean
          author_id?: string
          author_name?: string
          content?: string
          created_at?: string
          id?: string
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
          public_visible: boolean
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
          public_visible?: boolean
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
          public_visible?: boolean
          status?: string
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
      template_checks: {
        Row: {
          area: string
          code: string
          created_at: string
          evidence: string
          id: string
          label: string
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
          position?: number
          requirement?: string
          severity?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          moderated_at: string | null
          moderated_by: string | null
          moderation_note: string | null
          approved: boolean
          author_id: string | null
          author_name: string
          avatar_url: string | null
          company: string
          content: string
          created_at: string
          featured: boolean
          id: string
          outcome: string
          position: number
          role_title: string
          updated_at: string
        }
        Insert: {
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_note?: string | null
          approved?: boolean
          author_id?: string | null
          author_name: string
          avatar_url?: string | null
          company?: string
          content: string
          created_at?: string
          featured?: boolean
          id?: string
          outcome?: string
          position?: number
          role_title?: string
          updated_at?: string
        }
        Update: {
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_note?: string | null
          approved?: boolean
          author_id?: string | null
          author_name?: string
          avatar_url?: string | null
          company?: string
          content?: string
          created_at?: string
          featured?: boolean
          id?: string
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
      bootstrap_current_user: {
        Args: { _full_name?: string }
        Returns: Database["public"]["Enums"]["app_role"]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      can_access_lesson: {
        Args: { _lesson_id: string; _user_id: string }
        Returns: boolean
      }
      delete_my_account: { Args: never; Returns: undefined }
      increment_listing_views: {
        Args: { _listing_id: string }
        Returns: undefined
      }
      increment_topic_views: { Args: { _topic_id: string }; Returns: undefined }
      is_conversation_participant: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      lms_lesson_content: {
        Args: { _lesson_id: string }
        Returns: {
          content: string
          video_url: string
        }[]
      }
      member_accepts_messages: { Args: { _user_id: string }; Returns: boolean }
      module_defaults: { Args: never; Returns: Json }
      module_enabled: { Args: { _key: string }; Returns: boolean }
      purge_contact_messages: { Args: never; Returns: number }
      payment_start_course: {
        Args: { _user_id: string; _course_id: string; _waiver: boolean }
        Returns: {
          id: string
          amount_cents: number
          currency: string
          product_label: string
          course_slug: string
        }[]
      }
      payment_attach_session: {
        Args: { _payment_id: string; _session_id: string }
        Returns: undefined
      }
      payment_mark_paid: {
        Args: { _session_id: string; _intent: string; _amount: number; _currency: string }
        Returns: boolean
      }
      payment_mark_status: { Args: { _session_id: string; _status: string }; Returns: boolean }
      payment_mark_refunded: { Args: { _intent: string }; Returns: boolean }
      valid_page_data: { Args: { _data: Json }; Returns: boolean }
      request_directory_claim: {
        Args: { _listing_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
