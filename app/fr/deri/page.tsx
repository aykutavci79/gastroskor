import StoriesPage from '../stories/page'

export const metadata = {
  title: 'Deri | DeriveKemik',
  description: 'Stories by Deri (English)',
}

// Şimdilik Deri = mevcut EN story listesi (/en/stories)
// Yazar ayrımı (deri/kemik) DB'de gelince burada filtre yapacağız.
export default function EnDeriPage() {
  return <StoriesPage />
}
