export const metadata = { title: 'Cookieポリシー | kai' }

export default function CookiePage() {
  return (
    <article className="space-y-6 text-sm leading-relaxed" style={{ color: '#cbd5e1' }}>
      <div className="space-y-1">
        <p className="text-xs" style={{ color: '#64748b' }}>v2.0 — 2026年5月23日改定</p>
        <h1 className="text-xl font-semibold" style={{ color: '#f1f5f9' }}>Cookieポリシー</h1>
        <p className="text-xs" style={{ color: '#64748b' }}>AI搭載 家計管理ダッシュボード「KAI」 / 開発・運営者：BODO</p>
      </div>

      <p>「KAI — AI搭載 家計管理ダッシュボード」（以下、「本サービス」といいます）では、ユーザーの皆様に本サービスを円滑かつ安全にご利用いただくため、Cookie（クッキー）およびローカルストレージ（LocalStorage）などのウェブブラウザ類似技術を使用しています。本ポリシーでは、これらの技術の利用目的、内容、および管理方法について説明します。</p>

      <section className="space-y-2">
        <h2 className="font-semibold" style={{ color: '#f1f5f9' }}>1. Cookieおよび類似技術について</h2>
        <p>Cookieとは、ウェブサイトを訪問した際に、ブラウザを通じてユーザーのデバイス（PCやスマートフォンなど）に一時的に保存される小さなテキストファイルです。ローカルストレージ（LocalStorage）は、ブラウザ内により永続的に、かつセキュアにデータを保持するための仕組みです。これらを利用することで、同一ユーザーによる再訪問時のログイン状態の維持や、UI表示設定の保持が可能になります。</p>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold" style={{ color: '#f1f5f9' }}>2. 利用するCookie・ローカルストレージの目的</h2>
        <p>本サービスでは、サービス提供に必要不可欠な技術的用途（「ファーストパーティの必須Cookie/ストレージ」）のみを使用しており、ユーザーを追跡する行動ターゲティング広告の配信や、マーケティング目的のサードパーティCookieは一切使用していません。</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr style={{ background: '#0f172a', color: '#94a3b8' }}>
                <th className="text-left p-2.5 border" style={{ borderColor: '#1e293b' }}>技術の種類</th>
                <th className="text-left p-2.5 border" style={{ borderColor: '#1e293b' }}>利用目的</th>
                <th className="text-left p-2.5 border" style={{ borderColor: '#1e293b' }}>仕組み</th>
              </tr>
            </thead>
            <tbody>
              {[
                [
                  'ユーザー認証・セッション管理',
                  'Google OAuth認証完了後のセッション維持、および認証状態の暗号化確認（次回アクセス時に再ログインを省略し、セキュアにマイページを表示するため）。',
                  'Supabase Auth（ブラウザのLocalStorageまたはセッションCookieに、暗号化された安全なJWTトークンを保持します）',
                ],
                [
                  'セキュリティ制御',
                  'クロスサイトリクエストフォージェリ（CSRF）やセッションハイジャック等のサイバー攻撃を防止し、ユーザーのリクエストが正規のブラウザから安全に行われているかを通信ごとに検証するため。',
                  'Next.jsミドルウェア / Supabase（通信検証用の短期トークン）',
                ],
                [
                  'UI/UX状態の保持',
                  'ダークモード/ライトモードの切り替え設定や、カレンダービューにおける初期表示月など、ユーザー自身がカスタマイズしたインターフェース状態を維持するため。',
                  '本サービス共通（ブラウザのLocalStorageを活用したステート状態管理）',
                ],
              ].map(([type, purpose, mechanism], i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? '#0a0a10' : '#0d1117' }}>
                  <td className="p-2.5 border font-medium" style={{ borderColor: '#1e293b', color: '#94a3b8', verticalAlign: 'top', minWidth: '100px' }}>{type}</td>
                  <td className="p-2.5 border" style={{ borderColor: '#1e293b', verticalAlign: 'top' }}>{purpose}</td>
                  <td className="p-2.5 border" style={{ borderColor: '#1e293b', verticalAlign: 'top' }}>{mechanism}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold" style={{ color: '#f1f5f9' }}>3. 広告・アナリティクス等のCookie非導入宣言</h2>
        <p>本サービスは個人開発のポートフォリオ作品および家族運用を主目的とした独立したアプリケーションです。以下の目的を持つサードパーティ技術は一切導入していません。</p>
        <ul className="space-y-1.5 pl-4" style={{ borderLeft: '2px solid #334155' }}>
          {[
            'Google AdSense等のバナー広告配信およびユーザー追跡用Cookie',
            'Google Analytics等の詳細な行動履歴分析サードパーティツール（プライバシーファーストの設計思想に基づき、自社システムエラーログ api_error_logs でのみ保守を行っています）',
            'SNS連携ボタン（シェア用）によるトラッキングCookie',
          ].map((item, i) => (
            <li key={i} className="pl-3">{item}</li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold" style={{ color: '#f1f5f9' }}>4. Cookieの管理および無効化の方法</h2>
        <p>多くのウェブブラウザでは、標準設定でCookieが自動的に有効になっています。ユーザーはご自身が利用するブラウザの設定を変更することで、Cookieの受け入れを拒否したり、保存されたCookie・ローカルストレージデータをいつでも一括削除したりすることができます。</p>
        <p>主要なブラウザ（Google Chrome、Safari、Microsoft Edge、Mozilla Firefox等）での具体的な設定・削除方法については、それぞれの公式ヘルプページをご参照ください。</p>
        <div className="rounded-lg p-4 text-xs" style={{ background: '#1e1b2e', color: '#f59e0b', borderLeft: '3px solid #f59e0b' }}>
          <span className="font-semibold">利用上の注意点：</span> 本サービスで使用しているCookie・ローカルストレージは、すべてシステムのログイン認証やサイバー攻撃からの防衛に直結する「必須」のものです。そのため、これらを完全に無効化または削除した場合、本サービスへのログイン、ダッシュボードの表示、家計簿データの同期といったコア機能が正常に利用できなくなります。本サービスを利用される際は、CookieおよびローカルストレージをONにすることをお勧めいたします。
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold" style={{ color: '#f1f5f9' }}>5. ポリシーの変更</h2>
        <p>運営者は、本サービスのアップデート（セキュリティ機能の強化等）や、法規制の変更に対応するため、本ポリシーを適宜変更することがあります。本ポリシーを変更する場合、アプリ内の通知またはトップページにて告知します。</p>
      </section>

      <p className="text-xs pt-4" style={{ color: '#475569', borderTop: '1px solid #1e293b' }}>
        問い合わせ窓口：運営者が指定するGoogleフォーム
      </p>
    </article>
  )
}
