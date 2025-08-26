export default function StructuredData() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'MuscleGram',
    description: '筋力トレーニングに特化したソーシャルネットワークアプリ。筋トレ記録、分析、継続サポート、他のユーザーとの交流であなたのワークアウトを強力にサポート！',
    url: 'https://musclegram.net',
    applicationCategory: 'HealthApplication',
    operatingSystem: 'Web Browser, iOS, Android',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'JPY',
    },
    author: {
      '@type': 'Organization',
      name: 'MuscleGram Team',
    },
    publisher: {
      '@type': 'Organization',
      name: 'MuscleGram',
      logo: {
        '@type': 'ImageObject',
        url: 'https://musclegram.net/app_logo.png',
      },
    },
    featureList: [
      '筋トレ記録・管理',
      'ワークアウト分析',
      'PR（個人記録）追跡',
      '次回トレーニング推奨',
      'ソーシャル機能（フォロー、いいね、コメント）',
      'カレンダー表示',
      'プログレス可視化',
      'PWA対応（オフライン利用可能）'
    ],
    screenshot: 'https://musclegram.net/app_logo.png',
    softwareVersion: '1.0.0',
    datePublished: '2024-01-01',
    dateModified: new Date().toISOString(),
    inLanguage: 'ja-JP',
    audience: {
      '@type': 'Audience',
      audienceType: 'フィットネス愛好者、筋トレ初心者から上級者',
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}