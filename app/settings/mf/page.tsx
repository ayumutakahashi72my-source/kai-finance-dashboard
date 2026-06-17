import { redirect } from 'next/navigation'

// パスが /settings/integrations/mf に移動したため恒久リダイレクト
export default function MfSettingsRedirect() {
  redirect('/settings/integrations/mf')
}
