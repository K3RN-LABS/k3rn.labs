# Plan : Profil utilisateur, inscription, paramètres, menu

## Contexte

La page workspace affiche "Bonjour, Thomas." en dur. Il n'y a pas de système de profil utilisateur, pas de page paramètres, et le menu utilisateur a un label "Bibliothèque" à renommer. Ce plan implémente :
- La table `profiles` dans Supabase
- La collecte du nom/type d'entité/nom de labo à l'inscription
- Une page Paramètres pour modifier ces infos
- Le remplacement du message d'accueil par le vrai nom
- Le renommage du menu en "Mes Dossiers" + navigation vers /settings

---

## Fichiers à créer

### 1. `supabase/migrations/001_create_profiles.sql`
Migration SQL pour créer la table `profiles` avec :
- `id` UUID (PK, FK → auth.users, CASCADE)
- `display_name` TEXT
- `entity_type` TEXT (CHECK: 'individual' | 'company')
- `lab_name` TEXT
- `created_at`, `updated_at` TIMESTAMPTZ
- RLS : SELECT/INSERT/UPDATE pour `auth.uid() = id`
- Trigger `handle_updated_at()` pour auto-maj du `updated_at`

### 2. `src/lib/types/profile.ts`
Types TypeScript : `Profile` et `ProfileUpdate`

### 3. `src/hooks/use-profile.ts`
Hook React `useProfile()` :
- Fetch le profil depuis Supabase quand `user` change
- Expose `profile`, `isLoading`, `createProfile()`, `updateProfile()`
- Gère le cas "pas encore de profil" (PGRST116)

### 4. `src/app/settings/page.tsx`
Page Paramètres avec :
- Header app (`SiteHeader variant="app"`)
- Formulaire : display_name, entity_type (toggle), lab_name
- Bouton sauvegarder, toasts succès/erreur
- Style cohérent (card L1 #2C2F38, inputs existants, accent #F75105)

---

## Fichiers à modifier

### 5. `src/lib/i18n/dictionary.ts`
Ajouts dans les 3 locales (FR/EN/ES) :
- `auth.myDossiers` : "Mes Dossiers" / "My Dossiers" / "Mis Expedientes"
- `auth.displayName`, `auth.entityType`, `auth.entityIndividual`, `auth.entityCompany`, `auth.labName`
- Nouvelle section `settings` : title, subtitle, profileSection, save, saving, saved, error, placeholders
- `workspace.welcome` : "Bonjour" / "Hello" / "Hola"
- `workspace.defaultUser` : "Utilisateur" / "User" / "Usuario"

### 6. `src/providers/auth-provider.tsx`
- Étendre `signUp()` pour accepter `profileData` (display_name, entity_type, lab_name)
- Passer les données profil dans `options.data` de `supabase.auth.signUp()` (stockées dans user_metadata)
- Dans `onAuthStateChange`, quand `SIGNED_IN` : auto-créer le profil si absent (depuis user_metadata)

### 7. `src/components/auth/auth-modal.tsx`
Ajouter dans l'onglet inscription :
- Champ "Nom d'affichage" (input texte avec icône User)
- Sélecteur "Type d'entité" (toggle boutons Individuel/Entreprise)
- Champ "Nom du laboratoire" (input texte avec icône Flask/Beaker)
- Appel à `signUp(email, password, { display_name, entity_type, lab_name })`

### 8. `src/app/workspace/page.tsx`
- Importer `useProfile` et `useLanguageStore`
- Remplacer `Bonjour, Thomas.` par `{t.workspace.welcome}, {profile?.display_name || t.workspace.defaultUser}.`

### 9. `src/components/layout/user-nav.tsx`
- Importer `useProfile`, changer icône Library → FolderOpen
- Afficher `profile?.display_name` dans le label du dropdown
- Changer `t.auth.library` → `t.auth.myDossiers`
- Ajouter `onClick={() => router.push("/settings")}` sur le menu item Paramètres

---

## Ordre d'implémentation

1. SQL migration + type Profile (pas de dépendances)
2. Hook useProfile (dépend du type)
3. Dictionnaire i18n (pas de dépendances)
4. auth-provider.tsx (dépend de la table profiles)
5. auth-modal.tsx (dépend du auth-provider modifié + i18n)
6. settings page (dépend du hook + i18n)
7. workspace page (dépend du hook + i18n)
8. user-nav (dépend du hook + i18n)

---

## Vérification

1. Exécuter la migration SQL dans Supabase (Dashboard ou CLI)
2. `npm run dev` - vérifier que l'app compile sans erreur TypeScript
3. Tester l'inscription : les 3 champs apparaissent, le profil est créé en BDD
4. Tester la page /settings : le formulaire charge les données, sauvegarde fonctionne
5. Vérifier le workspace : "Bonjour, [nom]." s'affiche correctement
6. Vérifier le menu utilisateur : "Mes Dossiers" et navigation vers /settings
