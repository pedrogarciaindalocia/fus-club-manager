-- Migration: Ajout de U25 à l'enum public.age_category
-- Permet la création et la gestion des équipes, joueurs et surclassements de la catégorie U25 (Équipe Espoirs / Réserve FUS)

ALTER TYPE public.age_category ADD VALUE IF NOT EXISTS 'U25';
