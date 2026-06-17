-- function_search_path_mutable 解消 & get_household_members_with_email anon 権限剥奪

-- ① get_household_members_with_email: REVOKE ALL FROM PUBLIC が抜けていた
REVOKE ALL    ON FUNCTION public.get_household_members_with_email() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_household_members_with_email() TO authenticated;

-- ② seed_default_categories: trigger 関数に SET search_path = '' を追加
CREATE OR REPLACE FUNCTION public.seed_default_categories()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.categories (household_id, name, color, icon, is_fixed) VALUES
    (NEW.id, '食費',       '#5eead4', '🍱', true),
    (NEW.id, '交通費',     '#22d3ee', '🚃', true),
    (NEW.id, '日用品',     '#a78bfa', '🛒', true),
    (NEW.id, '光熱費',     '#fbbf24', '💡', true),
    (NEW.id, '医療・健康', '#4ade80', '💊', true),
    (NEW.id, '外食',       '#f97316', '🍜', false),
    (NEW.id, '娯楽',       '#ec4899', '🎮', false),
    (NEW.id, '収入',       '#86efac', '💰', false),
    (NEW.id, 'その他',     '#8b8ba0', '📌', false);
  RETURN NEW;
END;
$$;

-- ③ setup_demo_household: SET search_path = '' を追加
CREATE OR REPLACE FUNCTION public.setup_demo_household(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_household_id uuid;
  v_cat_food      uuid;
  v_cat_transport uuid;
  v_cat_util      uuid;
  v_cat_leisure   uuid;
  v_cat_medical   uuid;
  v_cat_clothing  uuid;
  v_cat_income    uuid;
  v_cat_housing   uuid;
  v_cat_daily     uuid;
BEGIN
  SELECT household_id INTO v_household_id
  FROM public.household_members
  WHERE user_id = p_user_id
  LIMIT 1;

  IF v_household_id IS NOT NULL THEN
    RETURN 'already_exists:' || v_household_id;
  END IF;

  INSERT INTO public.households (name, owner_id)
  VALUES ('デモ家族', p_user_id)
  RETURNING id INTO v_household_id;

  INSERT INTO public.household_members (household_id, user_id, role, is_admin)
  VALUES (v_household_id, p_user_id, 'owner', true);

  INSERT INTO public.categories (household_id, name, color, icon) VALUES
    (v_household_id, '食費',       '#fb9477', 'utensils')    RETURNING id INTO v_cat_food;
  INSERT INTO public.categories (household_id, name, color, icon) VALUES
    (v_household_id, '交通費',     '#7aa7ff', 'train')       RETURNING id INTO v_cat_transport;
  INSERT INTO public.categories (household_id, name, color, icon) VALUES
    (v_household_id, '光熱費',     '#a78bfa', 'zap')         RETURNING id INTO v_cat_util;
  INSERT INTO public.categories (household_id, name, color, icon) VALUES
    (v_household_id, '娯楽',       '#34d399', 'music')       RETURNING id INTO v_cat_leisure;
  INSERT INTO public.categories (household_id, name, color, icon) VALUES
    (v_household_id, '医療費',     '#f472b6', 'heart-pulse') RETURNING id INTO v_cat_medical;
  INSERT INTO public.categories (household_id, name, color, icon) VALUES
    (v_household_id, '衣服',       '#fbbf24', 'shirt')       RETURNING id INTO v_cat_clothing;
  INSERT INTO public.categories (household_id, name, color, icon) VALUES
    (v_household_id, '収入',       '#4ade80', 'briefcase')   RETURNING id INTO v_cat_income;
  INSERT INTO public.categories (household_id, name, color, icon) VALUES
    (v_household_id, '住居費',     '#e879f9', 'home')        RETURNING id INTO v_cat_housing;
  INSERT INTO public.categories (household_id, name, color, icon) VALUES
    (v_household_id, '日用品',     '#94a3b8', 'shopping-bag') RETURNING id INTO v_cat_daily;

  PERFORM public._seed_demo_transactions(
    v_household_id,
    v_cat_food, v_cat_transport, v_cat_util,
    v_cat_leisure, v_cat_medical, v_cat_clothing, v_cat_income,
    v_cat_housing, v_cat_daily
  );

  PERFORM public._seed_demo_goals(v_household_id);
  PERFORM public._seed_demo_monthly_data(v_household_id);

  RETURN 'created:' || v_household_id;
END;
$$;

REVOKE ALL    ON FUNCTION public.setup_demo_household(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.setup_demo_household(uuid) TO authenticated;

-- ④ _seed_demo_transactions (10引数): SET search_path = '' を追加
CREATE OR REPLACE FUNCTION public._seed_demo_transactions(
  p_hid          uuid,
  p_food         uuid,
  p_transport    uuid,
  p_util         uuid,
  p_leisure      uuid,
  p_medical      uuid,
  p_clothing     uuid,
  p_income       uuid,
  p_housing      uuid,
  p_daily        uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  base_date date := date_trunc('month', now())::date;
BEGIN
  FOR mo IN 0..5 LOOP
    DECLARE
      m  date := base_date - (mo || ' months')::interval;
      y  int  := extract(year  FROM m)::int;
      mn int  := extract(month FROM m)::int;
    BEGIN
      INSERT INTO public.transactions (household_id, category_id, payee, amount, occurred_on, source) VALUES
        (p_hid, p_income, '株式会社サンプル（給与）', 280000, make_date(y, mn, 25), 'manual');
      IF mn % 2 = 0 THEN
        INSERT INTO public.transactions (household_id, category_id, payee, amount, occurred_on, source) VALUES
          (p_hid, p_income, 'フリーランス収入', 35000, make_date(y, mn, 28), 'manual');
      END IF;

      INSERT INTO public.transactions (household_id, category_id, payee, amount, occurred_on, source) VALUES
        (p_hid, p_housing, '家賃（2LDK）',    -95000, make_date(y, mn,  1), 'manual'),
        (p_hid, p_housing, '管理費・共益費',   -8000,  make_date(y, mn,  1), 'manual');

      INSERT INTO public.transactions (household_id, category_id, payee, amount, occurred_on, source) VALUES
        (p_hid, p_util, '東京電力',      -8400,  make_date(y, mn,  5), 'manual'),
        (p_hid, p_util, '東京ガス',      -4200,  make_date(y, mn,  6), 'manual'),
        (p_hid, p_util, 'NTT ドコモ',    -9800,  make_date(y, mn,  7), 'manual'),
        (p_hid, p_util, 'NTT フレッツ',  -4400,  make_date(y, mn,  8), 'manual');

      INSERT INTO public.transactions (household_id, category_id, payee, amount, occurred_on, source) VALUES
        (p_hid, p_food, 'スーパーライフ',      -4820,  make_date(y, mn,  2), 'manual'),
        (p_hid, p_food, 'コンビニ（朝食）',    -680,   make_date(y, mn,  3), 'manual'),
        (p_hid, p_food, 'スーパーライフ',      -5340,  make_date(y, mn,  7), 'manual'),
        (p_hid, p_food, 'ランチ 定食屋',       -950,   make_date(y, mn,  8), 'manual'),
        (p_hid, p_food, 'コンビニ',            -520,   make_date(y, mn,  9), 'manual'),
        (p_hid, p_food, '業務スーパー',        -6200,  make_date(y, mn, 12), 'manual'),
        (p_hid, p_food, 'スシロー（外食）',    -3200,  make_date(y, mn, 14), 'manual'),
        (p_hid, p_food, 'スーパーライフ',      -4100,  make_date(y, mn, 16), 'manual'),
        (p_hid, p_food, 'コンビニ',            -440,   make_date(y, mn, 17), 'manual'),
        (p_hid, p_food, '業務スーパー',        -5800,  make_date(y, mn, 20), 'manual'),
        (p_hid, p_food, 'スーパーライフ',      -3900,  make_date(y, mn, 22), 'manual'),
        (p_hid, p_food, '焼肉 花火（外食）',   -5600,  make_date(y, mn, 24), 'manual'),
        (p_hid, p_food, 'コンビニ',            -360,   make_date(y, mn, 26), 'manual'),
        (p_hid, p_food, 'Uber Eats',           -1850,  make_date(y, mn, 10), 'manual'),
        (p_hid, p_food, 'マクドナルド',        -780,   make_date(y, mn, 15), 'manual'),
        (p_hid, p_food, 'カフェ DOUTOR',       -620,   make_date(y, mn, 18), 'manual'),
        (p_hid, p_food, 'スーパーマルエツ',    -3280,  make_date(y, mn, 27), 'manual');

      INSERT INTO public.transactions (household_id, category_id, payee, amount, occurred_on, source) VALUES
        (p_hid, p_transport, 'Suica チャージ',  -3000,  make_date(y, mn,  1), 'manual'),
        (p_hid, p_transport, '定期券更新',      -12600, make_date(y, mn,  1), 'manual'),
        (p_hid, p_transport, 'タクシー',         -1200, make_date(y, mn, 18), 'manual');
      IF mo % 3 = 0 THEN
        INSERT INTO public.transactions (household_id, category_id, payee, amount, occurred_on, source) VALUES
          (p_hid, p_transport, '新幹線（往復）', -16400, make_date(y, mn, 10), 'manual');
      END IF;

      INSERT INTO public.transactions (household_id, category_id, payee, amount, occurred_on, source) VALUES
        (p_hid, p_leisure, 'Netflix',         -1490,  make_date(y, mn,  1), 'manual'),
        (p_hid, p_leisure, 'Amazon Prime',    -600,   make_date(y, mn,  1), 'manual'),
        (p_hid, p_leisure, 'Spotify',         -980,   make_date(y, mn,  1), 'manual'),
        (p_hid, p_leisure, '映画館',           -1900,  make_date(y, mn, 11), 'manual');
      IF mn % 2 = 1 THEN
        INSERT INTO public.transactions (household_id, category_id, payee, amount, occurred_on, source) VALUES
          (p_hid, p_leisure, 'Nintendo Switch ゲーム', -4480, make_date(y, mn, 20), 'manual'),
          (p_hid, p_leisure, 'カラオケ',               -2400, make_date(y, mn, 23), 'manual');
      END IF;
      IF mn % 2 = 0 THEN
        INSERT INTO public.transactions (household_id, category_id, payee, amount, occurred_on, source) VALUES
          (p_hid, p_leisure, 'スポーツジム（月会費）', -7700, make_date(y, mn,  5), 'manual'),
          (p_hid, p_leisure, 'ボウリング',             -1600, make_date(y, mn, 28), 'manual');
      END IF;

      INSERT INTO public.transactions (household_id, category_id, payee, amount, occurred_on, source) VALUES
        (p_hid, p_daily, 'ドラッグストア マツキヨ', -2340, make_date(y, mn,  4), 'manual'),
        (p_hid, p_daily, 'ニトリ',                  -3980, make_date(y, mn, 13), 'manual'),
        (p_hid, p_daily, 'ダイソー',                -880,  make_date(y, mn, 19), 'manual');

      IF mo % 3 = 0 THEN
        INSERT INTO public.transactions (household_id, category_id, payee, amount, occurred_on, source) VALUES
          (p_hid, p_clothing, 'ユニクロ', -7900, make_date(y, mn, 13), 'manual');
      END IF;
      IF mo % 3 = 1 THEN
        INSERT INTO public.transactions (household_id, category_id, payee, amount, occurred_on, source) VALUES
          (p_hid, p_clothing, 'GU', -4200, make_date(y, mn, 21), 'manual');
      END IF;

      IF mo % 2 = 1 THEN
        INSERT INTO public.transactions (household_id, category_id, payee, amount, occurred_on, source) VALUES
          (p_hid, p_medical, '近所のクリニック', -3000, make_date(y, mn, 19), 'manual'),
          (p_hid, p_medical, '調剤薬局',         -1240, make_date(y, mn, 20), 'manual');
      END IF;
    END;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public._seed_demo_transactions(uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid) FROM PUBLIC;

-- ⑤ _seed_demo_goals: SET search_path = '' を追加
CREATE OR REPLACE FUNCTION public._seed_demo_goals(p_hid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.financial_goals
    (household_id, name, target_amount, deadline, monthly_savings_target, monthly_spending_limit,
     risk_level, advice, plan_steps, is_active)
  VALUES
    (
      p_hid, '夏休み旅行積立', 200000,
      date_trunc('year', now())::date + interval '7 months' - interval '1 day',
      25000, 160000, 'safe',
      '毎月2.5万円の積立で達成可能です。外食を週1回に絞るとペースアップできます。',
      ARRAY['月末に積立口座へ自動振替を設定する', '外食費を月2万円以内に抑える', 'サブスクを見直し月500円節約する'],
      true
    ),
    (
      p_hid, '緊急予備費（生活6か月分）', 600000,
      (date_trunc('year', now()) + interval '1 year 3 months')::date,
      18000, 170000, 'caution',
      '目標まであと約33か月。固定費の見直しで月2万円の余力を作りましょう。',
      ARRAY['固定費を月10万円以内に抑える', '副業収入を貯蓄へ全額回す', '支出スコアBを維持する'],
      true
    ),
    (
      p_hid, '住宅購入頭金', 3000000,
      (date_trunc('year', now()) + interval '3 years')::date,
      55000, 150000, 'danger',
      '現在の収支では月5.5万円の積立が必要です。支出削減か収入増加が求められます。',
      ARRAY['月次スコアA以上を3か月連続維持する', '衣服・娯楽費を合計3万円以内にする', '副業収入月3万円を目指す', 'iDeCo・NISA活用を検討する'],
      true
    );
END;
$$;

REVOKE ALL ON FUNCTION public._seed_demo_goals(uuid) FROM PUBLIC;

-- ⑥ _seed_demo_monthly_data: SET search_path = '' を追加
CREATE OR REPLACE FUNCTION public._seed_demo_monthly_data(p_hid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  base_date date := date_trunc('month', now())::date;
  summaries text[] := ARRAY[
    '今月は食費が先月比で8%増加しました。外食（焼肉・スシロー）が主な要因です。一方、光熱費は前月より1,200円減少しており、節電の効果が出ています。交通費は新幹線利用で先月比+16,400円と大きく増えましたが、年3〜4回の範囲内です。収入は280,000円で安定しており、住居費・固定費を除いた可処分支出は約112,000円でした。今月のスコアはB（73点）。来月は外食を週1回に抑え、食費を42,000円以内に収めることを目標にしましょう。',
    '今月は副業収入35,000円が加算され、収支バランスが改善されました。食費・日用品ともに先月並みで安定しています。スポーツジムへの入会（7,700円/月）は健康投資として継続価値があります。サブスクリプション合計は3,070円で管理が行き届いています。収入315,000円に対し支出は約198,000円、月次黒字は約117,000円でした。スコアはA（82点）で過去6か月の最高値。この水準を維持すれば夏休み旅行積立の目標を2か月前倒しで達成できます。',
    '光熱費が冬季のため例月比+3,400円（東京電力8,400円、東京ガス4,200円）となりました。食費はUber Eatsの利用が2回あり合計48,820円とやや高めです。医療費は定期通院とクリニック受診で4,240円。娯楽費はNetflix・Amazon・Spotifyのサブスク3点＋映画鑑賞で4,970円と抑えられています。月次黒字は約89,000円。スコアはB（68点）。来月は食費のデリバリー依存を減らし、自炊率を上げることで月3,000〜5,000円の節約が期待できます。',
    '衣服費（ユニクロ7,900円）が加算された月でした。一方でカラオケや外出娯楽はなく、娯楽費は3,070円（サブスクのみ）と低水準です。交通費は定期券更新（12,600円）があったため先月比で増加しています。食費は前月並みの約47,000円。副業収入なしの月でしたが、固定費管理が徹底されており黒字幅は約95,000円を維持しました。スコアはB（71点）。住居費を除く変動費合計が89,000円以内に収まったことが高評価のポイントです。',
    '今月はゲーム購入（Nintendo Switch 4,480円）とカラオケ（2,400円）で娯楽費が例月比＋6,880円増加しました。スポーツジムの月会費はなく、体を動かす活動はボウリングのみ（1,600円）でした。食費はマクドナルド・コンビニ利用が多く合計49,200円とやや多め。医療費は受診なし。副業収入35,000円加算で収入合計315,000円。月次黒字は約102,000円でスコアはA（78点）。夏休み旅行積立へ30,000円を振替えることを推奨します。'
  ];
  scores    int[]  := ARRAY[73, 82, 68, 71, 78];
  grades    text[] := ARRAY['B', 'A', 'C', 'B', 'B'];
  b_scores  int[]  := ARRAY[38, 45, 32, 36, 42];
  s_scores  int[]  := ARRAY[25, 27, 22, 25, 26];
  bo_scores int[]  := ARRAY[10, 10, 14, 10, 10];
BEGIN
  FOR i IN 1..5 LOOP
    DECLARE
      m  date := base_date - (i || ' months')::interval;
      y  int  := extract(year  FROM m)::int;
      mn int  := extract(month FROM m)::int;
    BEGIN
      INSERT INTO public.monthly_summaries (household_id, year, month, content)
      VALUES (p_hid, y, mn, summaries[i])
      ON CONFLICT (household_id, year, month) DO UPDATE SET content = EXCLUDED.content;

      INSERT INTO public.monthly_scores
        (household_id, month, score, budget_score, saving_score, bonus_score, score_grade,
         score_detail, is_finalized, calculated_at)
      VALUES (
        p_hid,
        m,
        scores[i],
        b_scores[i],
        s_scores[i],
        bo_scores[i],
        grades[i],
        jsonb_build_object(
          'budget_score', b_scores[i],
          'saving_score', s_scores[i],
          'bonus_score',  bo_scores[i],
          'total',        scores[i]
        ),
        true,
        m + interval '1 month' - interval '1 day' + interval '23 hours'
      )
      ON CONFLICT (household_id, month) DO UPDATE
        SET score         = EXCLUDED.score,
            budget_score  = EXCLUDED.budget_score,
            saving_score  = EXCLUDED.saving_score,
            bonus_score   = EXCLUDED.bonus_score,
            score_grade   = EXCLUDED.score_grade,
            score_detail  = EXCLUDED.score_detail,
            is_finalized  = EXCLUDED.is_finalized,
            calculated_at = EXCLUDED.calculated_at;
    END;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public._seed_demo_monthly_data(uuid) FROM PUBLIC;

-- ⑦ reset_demo_data: SET search_path = '' を追加
CREATE OR REPLACE FUNCTION public.reset_demo_data(p_demo_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_household_id uuid;
  v_food         uuid;
  v_transport    uuid;
  v_util         uuid;
  v_leisure      uuid;
  v_medical      uuid;
  v_clothing     uuid;
  v_income       uuid;
  v_housing      uuid;
  v_daily        uuid;
BEGIN
  SELECT hm.household_id INTO v_household_id
  FROM public.household_members hm
  JOIN auth.users u ON u.id = hm.user_id
  WHERE u.email = p_demo_email
  LIMIT 1;

  IF v_household_id IS NULL THEN RETURN; END IF;

  DELETE FROM public.transactions      WHERE household_id = v_household_id;
  DELETE FROM public.monthly_summaries WHERE household_id = v_household_id;
  DELETE FROM public.monthly_scores    WHERE household_id = v_household_id;
  DELETE FROM public.financial_goals   WHERE household_id = v_household_id;

  SELECT id INTO v_food      FROM public.categories WHERE household_id = v_household_id AND name = '食費'   LIMIT 1;
  SELECT id INTO v_transport FROM public.categories WHERE household_id = v_household_id AND name = '交通費' LIMIT 1;
  SELECT id INTO v_util      FROM public.categories WHERE household_id = v_household_id AND name = '光熱費' LIMIT 1;
  SELECT id INTO v_leisure   FROM public.categories WHERE household_id = v_household_id AND name = '娯楽'   LIMIT 1;
  SELECT id INTO v_medical   FROM public.categories WHERE household_id = v_household_id AND name = '医療費' LIMIT 1;
  SELECT id INTO v_clothing  FROM public.categories WHERE household_id = v_household_id AND name = '衣服'   LIMIT 1;
  SELECT id INTO v_income    FROM public.categories WHERE household_id = v_household_id AND name = '収入'   LIMIT 1;
  SELECT id INTO v_housing   FROM public.categories WHERE household_id = v_household_id AND name = '住居費' LIMIT 1;
  SELECT id INTO v_daily     FROM public.categories WHERE household_id = v_household_id AND name = '日用品' LIMIT 1;

  IF v_housing IS NULL THEN
    INSERT INTO public.categories (household_id, name, color, icon)
    VALUES (v_household_id, '住居費', '#e879f9', 'home')
    RETURNING id INTO v_housing;
  END IF;
  IF v_daily IS NULL THEN
    INSERT INTO public.categories (household_id, name, color, icon)
    VALUES (v_household_id, '日用品', '#94a3b8', 'shopping-bag')
    RETURNING id INTO v_daily;
  END IF;

  PERFORM public._seed_demo_transactions(
    v_household_id,
    v_food, v_transport, v_util,
    v_leisure, v_medical, v_clothing, v_income,
    v_housing, v_daily
  );

  PERFORM public._seed_demo_goals(v_household_id);
  PERFORM public._seed_demo_monthly_data(v_household_id);
END;
$$;

REVOKE ALL    ON FUNCTION public.reset_demo_data(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.reset_demo_data(text) TO authenticated;
