export default function StructuredData() {
  const jsonLd = [
    {
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
        availability: 'https://schema.org/InStock',
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
          width: 512,
          height: 512,
        },
      },
      featureList: [
        '筋トレ記録・管理',
        'ワークアウト分析',
        'AI分析によるパーソナライズドアドバイス',
        'PR（個人記録）追跡',
        '次回トレーニング推奨',
        'ソーシャル機能（フォロー、いいね、コメント）',
        'カレンダー表示',
        'プログレス可視化',
        'データエクスポート機能',
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
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.8',
        ratingCount: '150',
        bestRating: '5',
        worstRating: '1',
      },
      keywords: [
        '筋トレ',
        'フィットネス',
        'ワークアウト',
        '記録',
        '分析',
        'SNS',
        '筋力トレーニング',
        'トレーニング記録',
        'PR記録',
        'AI分析'
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'MuscleGram',
      url: 'https://musclegram.net',
      logo: {
        '@type': 'ImageObject',
        url: 'https://musclegram.net/app_logo.png',
        width: 512,
        height: 512,
      },
      sameAs: [
        'https://twitter.com/musclegram',
        'https://www.facebook.com/musclegram',
        'https://www.instagram.com/musclegram',
      ],
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'Customer Service',
        email: 'support@musclegram.net',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'MuscleGram',
      url: 'https://musclegram.net',
      description: '筋力トレーニングに特化したソーシャルネットワークアプリ',
      inLanguage: 'ja-JP',
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: 'https://musclegram.net/search?q={search_term_string}',
        },
        'query-input': 'required name=search_term_string',
      },
    }
  ]

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}