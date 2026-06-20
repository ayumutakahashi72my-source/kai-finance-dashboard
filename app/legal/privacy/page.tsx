export const metadata = { title: 'プライバシーポリシー | kai' }

export default function PrivacyPage() {
  return (
    <article className="space-y-6 text-sm leading-relaxed" style={{ color: 'var(--kai-text2)' }}>
      <div className="space-y-1">
        <p className="text-xs" style={{ color: 'var(--kai-text4)' }}>v2.0 — 2026年5月23日改定</p>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--kai-text1)' }}>プライバシーポリシー</h1>
        <p className="text-xs" style={{ color: 'var(--kai-text4)' }}>AI搭載 家計管理ダッシュボード「KAI」 / 開発・運営者：BODO</p>
      </div>

      <p>「KAI — AI搭載 家計管理ダッシュボード」（以下、「本サービス」といいます）は、ユーザーの個人情報およびプライバシーの保護について、日本の個人情報保護法その他の関係法令を遵守し、以下のとおりプライバシーポリシー（以下、「本ポリシー」といいます）を定めます。</p>

      <section className="space-y-3">
        <h2 className="font-semibold" style={{ color: 'var(--kai-text1)' }}>1. 取得する情報およびその取得方法</h2>
        <p>本サービスは、以下の方法により、それぞれの情報を取得・収集します。</p>
        <ul className="space-y-3 pl-4" style={{ borderLeft: '2px solid var(--kai-border-strong)' }}>
          <li className="pl-3">
            <span className="font-medium" style={{ color: 'var(--kai-text3)' }}>認証・プロファイル情報：</span>
            <span> Google OAuth認証を介して取得する、ユーザーの氏名（表示名）、メールアドレス、プロフィール画像URL、および一意のアカウント識別子（UID）。</span>
          </li>
          <li className="pl-3">
            <span className="font-medium" style={{ color: 'var(--kai-text3)' }}>ユーザー登録データ：</span>
            <span> 取引履歴（日付、金額、店舗名・品名、カテゴリ等）、CSVファイルのインポートにより取得される取引データ、予算設定、財務目標、およびAIチャットへの入力テキスト（プロンプト）。</span>
          </li>
          <li className="pl-3">
            <span className="font-medium" style={{ color: 'var(--kai-text3)' }}>外部サービス（Money Forward）の連携情報：</span>
            <span> ユーザーが明示的に登録したMoney Forwardのログイン資格情報（セッション維持トークンやCookie情報を含み、これらは強力な暗号化を施した上で保管されます）、および自動同期処理により取得される口座残高、取引履歴等の家計データ。</span>
          </li>
          <li className="pl-3">
            <span className="font-medium" style={{ color: 'var(--kai-text3)' }}>システム利用ログおよびCookie：</span>
            <span> 本サービスの利用状況、アクセス日時、AIモデルのトークン使用量、およびエラーログ（api_error_logs）。</span>
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold" style={{ color: 'var(--kai-text1)' }}>2. 利用目的</h2>
        <p>収集した情報は、以下の目的の範囲内でのみ利用します。あらかじめユーザーの同意を得ない限り、目的外利用は行いません。</p>
        <ul className="space-y-1.5 pl-4" style={{ borderLeft: '2px solid var(--kai-border-strong)' }}>
          {[
            '本サービスの提供、維持管理、およびユーザー認証のため。',
            'AI（Anthropic Claude）による取引データの自動分類、月次サマリーの生成、予算提案、およびチャット回答の作成のため。',
            'Money Forwardからの家計データの自動同期・反映のため。',
            '同一の世帯（households）として紐付けられた他のメンバーへの家計データの共有・表示のため。',
            'システムエラー、不具合の調査、サービスの改善、およびAIコスト（トークン使用量）の管理のため。',
          ].map((item, i) => (
            <li key={i} className="pl-3">{item}</li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold" style={{ color: 'var(--kai-text1)' }}>3. 外部送信およびサードパーティ連携</h2>
        <p>本サービスは、コア機能の提供にあたり、以下のサードパーティにデータを送信・委託しています。</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse" style={{ borderColor: 'var(--kai-border2)' }}>
            <thead>
              <tr style={{ background: 'var(--kai-bg-panel-solid)', color: 'var(--kai-text3)' }}>
                <th className="text-left p-2.5 border" style={{ borderColor: 'var(--kai-border2)' }}>送信先</th>
                <th className="text-left p-2.5 border" style={{ borderColor: 'var(--kai-border2)' }}>送信データ</th>
                <th className="text-left p-2.5 border" style={{ borderColor: 'var(--kai-border2)' }}>利用目的</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Supabase, Inc.', 'ユーザー識別子、メールアドレス、暗号化された連携情報、取引履歴、各種ログ', '認証管理および各種データのセキュアな保管。RLSによるアクセス制御。'],
                ['Anthropic, Inc.', '取引の品名・金額等のテキスト、月次支出統計、チャットの入力内容', 'AI自動分類（Haiku）、サマリー生成（Sonnet）、予算提案、チャット回答の生成。API経由の送信データはAIモデルの学習には使用されません。'],
                ['Vercel, Inc.', 'システム利用ログ、アクセスログ、自動同期の実行トリガー情報', 'アプリのホスティング、インフラ維持管理、Vercel Cron Jobsによる定期自動同期の実行。'],
              ].map(([dest, data, purpose], i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'var(--kai-bg)' : 'var(--kai-bg-card)' }}>
                  <td className="p-2.5 border font-medium" style={{ borderColor: 'var(--kai-border2)', color: 'var(--kai-text3)', verticalAlign: 'top', whiteSpace: 'nowrap' }}>{dest}</td>
                  <td className="p-2.5 border" style={{ borderColor: 'var(--kai-border2)', verticalAlign: 'top' }}>{data}</td>
                  <td className="p-2.5 border" style={{ borderColor: 'var(--kai-border2)', verticalAlign: 'top' }}>{purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold" style={{ color: 'var(--kai-text1)' }}>4. データの共有（世帯機能に関する特記事項）</h2>
        <p>本サービスには世帯（households）でのデータ共有機能が含まれています。ユーザーが他のユーザーを招待、または招待を承認して同一世帯のメンバー（household_members）となった場合、その世帯に属するすべてのメンバーに対して、ユーザーが登録・同期したすべての取引履歴、予算、月次スコア等の家計データが自動的に共有・開示されます。</p>
        <p>世帯内での共有を望まないプライベートなデータがある場合は、本サービスへの入力を控えるか、個人の世帯スペースをご利用ください。</p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold" style={{ color: 'var(--kai-text1)' }}>5. 安全管理措置</h2>
        <p>本サービスは、お預かりしたデータの漏洩、滅失、または毀損を防止するため、以下のセキュリティ対策を講じています。</p>
        <ul className="space-y-2 pl-4" style={{ borderLeft: '2px solid var(--kai-border-strong)' }}>
          <li className="pl-3"><span className="font-medium" style={{ color: 'var(--kai-text3)' }}>通信保護：</span> 全てのデータ通信におけるSSL/TLSによる暗号化。</li>
          <li className="pl-3"><span className="font-medium" style={{ color: 'var(--kai-text3)' }}>厳格なアクセス制御：</span> Supabaseの行レベルセキュリティ（RLS）を用いた、世帯単位での強固なデータベース層アクセス遮断。</li>
          <li className="pl-3"><span className="font-medium" style={{ color: 'var(--kai-text3)' }}>機密情報の隠蔽：</span> 外部連携用認証情報の暗号化保持、およびエラーログ（api_error_logs）における個人特定情報のマスク処理。</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold" style={{ color: 'var(--kai-text1)' }}>6. 個人情報の開示、訂正、利用停止、削除および退会</h2>
        <p>ユーザーは、本サービスの設定画面を通じて、いつでも登録データの訂正、Money Forwardの連携解除、およびアカウントの削除（退会）を行うことができます。ユーザーが退会手続きを完了した場合、または長期間（1年以上）本サービスへのログインがない場合、保存されている取引データ、予算データ、および外部連携情報はデータベースから合理的な期間内に完全に物理削除されます。その他の開示請求等については、本窓口（Googleフォーム）までご連絡ください。</p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold" style={{ color: 'var(--kai-text1)' }}>7. プライバシーポリシーの改定</h2>
        <p>運営者は、法令の改正や本サービスのアップデートに伴い、本ポリシーをいつでも改定できるものとします。本ポリシーを変更する場合、アプリ内の通知またはトップページにて告知します。変更後のポリシーは、告知がなされた時点、または告知に記載された効力発生日から適用されるものとします。</p>
      </section>

      <p className="text-xs pt-4" style={{ color: '#475569', borderTop: '1px solid #1e293b' }}>
        問い合わせ窓口：運営者が指定するGoogleフォーム
      </p>
    </article>
  )
}
