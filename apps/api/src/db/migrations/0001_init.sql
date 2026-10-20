CREATE SCHEMA IF NOT EXISTS app;

CREATE TABLE app.users (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email          text NOT NULL,
  name           text NOT NULL,
  avatar_url     text,
  password_hash  text,
  email_verified boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_uq UNIQUE (email)
);

CREATE TABLE app.oauth_accounts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES app.users (id) ON DELETE CASCADE,
  provider         text NOT NULL,
  provider_user_id text NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT oauth_accounts_provider_uq UNIQUE (provider, provider_user_id)
);
CREATE INDEX oauth_accounts_user_idx ON app.oauth_accounts (user_id);

CREATE TABLE app.refresh_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES app.users (id) ON DELETE CASCADE,
  family_id   uuid NOT NULL,
  token_hash  text NOT NULL UNIQUE,
  expires_at  timestamptz NOT NULL,
  revoked_at  timestamptz,
  replaced_by uuid REFERENCES app.refresh_tokens (id),
  rotated_at  timestamptz,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX refresh_tokens_family_idx ON app.refresh_tokens (family_id);
CREATE INDEX refresh_tokens_user_idx ON app.refresh_tokens (user_id);

CREATE TABLE app.password_reset_tokens (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES app.users (id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX password_reset_tokens_user_idx ON app.password_reset_tokens (user_id);

CREATE TABLE app.categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES app.users (id) ON DELETE CASCADE,
  name        text NOT NULL,
  type        text NOT NULL CHECK (type IN ('income', 'expense')),
  icon        text NOT NULL,
  color       text NOT NULL,
  archived_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX categories_user_type_name_uq ON app.categories (user_id, type, lower(name));

CREATE TABLE app.transactions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES app.users (id) ON DELETE CASCADE,
  category_id  uuid NOT NULL REFERENCES app.categories (id) ON DELETE RESTRICT,
  type         text NOT NULL CHECK (type IN ('income', 'expense')),
  amount_cents bigint NOT NULL CHECK (amount_cents > 0 AND amount_cents <= 100000000000),
  occurred_on  date NOT NULL,
  description  text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX transactions_user_date_idx ON app.transactions (user_id, occurred_on DESC, id DESC);
CREATE INDEX transactions_category_idx ON app.transactions (category_id);

-- Defesa em profundidade: o tipo do lançamento deve ser o tipo da categoria.
CREATE FUNCTION app.check_transaction_type() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  cat_type text;
BEGIN
  SELECT type INTO cat_type FROM app.categories WHERE id = NEW.category_id;
  IF cat_type IS DISTINCT FROM NEW.type THEN
    RAISE EXCEPTION 'tipo do lançamento (%) difere do tipo da categoria (%)', NEW.type, cat_type
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER transactions_type_matches_category
  BEFORE INSERT OR UPDATE OF type, category_id ON app.transactions
  FOR EACH ROW EXECUTE FUNCTION app.check_transaction_type();
