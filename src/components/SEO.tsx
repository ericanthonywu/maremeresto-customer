import React, { useEffect } from 'react'

export interface SEOProps {
  title?: string
  description?: string
  keywords?: string
  canonicalUrl?: string
  ogImage?: string
  ogType?: string
  jsonLd?: object
}

const DEFAULT_TITLE = 'Kuliner & Makanan Hangat Murah Surakarta Solo — Mareme Group'
const DEFAULT_DESCRIPTION =
  'Cari makanan hangat dan murah di Surakarta / Solo? Mareme Group menyajikan kuliner hangat, lezat, dan terjangkau seperti soto, bakmi, warmindo, wedangan, & kopi hangat dengan pesan online & pengantaran cepat di Solo.'
const DEFAULT_KEYWORDS =
  'makanan murah surakarta, makanan hangat solo, kuliner murah solo, tempat makan murah solo, warmindo surakarta, soto hangat solo, wedangan solo, kuliner surakarta terjangkau, mareme group solo, pesan makanan online solo'

export const SEO: React.FC<SEOProps> = ({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  keywords = DEFAULT_KEYWORDS,
  canonicalUrl,
  ogImage = '/favicon.svg',
  ogType = 'website',
  jsonLd,
}) => {
  useEffect(() => {
    // 1. Update Title
    document.title = title

    // Helper to update or create meta tags
    const updateMetaTag = (selector: string, attrName: string, attrValue: string, content: string) => {
      let element = document.querySelector(`meta[${selector}]`)
      if (!element) {
        element = document.createElement('meta')
        element.setAttribute(attrName, attrValue)
        document.head.appendChild(element)
      }
      element.setAttribute('content', content)
    }

    // Helper for link tags
    const updateLinkTag = (rel: string, href: string) => {
      let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null
      if (!link) {
        link = document.createElement('link')
        link.setAttribute('rel', rel)
        document.head.appendChild(link)
      }
      link.setAttribute('href', href)
    }

    // Basic Meta Tags
    updateMetaTag('name="description"', 'name', 'description', description)
    updateMetaTag('name="keywords"', 'name', 'keywords', keywords)

    // Geo Meta Tags for Surakarta / Solo
    updateMetaTag('name="geo.region"', 'name', 'geo.region', 'ID-JT')
    updateMetaTag('name="geo.placename"', 'name', 'geo.placename', 'Surakarta')
    updateMetaTag('name="geo.position"', 'name', 'geo.position', '-7.5666;110.8167')
    updateMetaTag('name="ICBM"', 'name', 'ICBM', '-7.5666, 110.8167')

    // Open Graph
    updateMetaTag('property="og:title"', 'property', 'og:title', title)
    updateMetaTag('property="og:description"', 'property', 'og:description', description)
    updateMetaTag('property="og:type"', 'property', 'og:type', ogType)
    updateMetaTag('property="og:site_name"', 'property', 'og:site_name', 'Mareme Group Solo')
    updateMetaTag('property="og:image"', 'property', 'og:image', ogImage)

    const currentUrl = canonicalUrl || window.location.href
    updateMetaTag('property="og:url"', 'property', 'og:url', currentUrl)
    updateLinkTag('canonical', currentUrl)

    // Twitter Card
    updateMetaTag('name="twitter:card"', 'name', 'twitter:card', 'summary_large_image')
    updateMetaTag('name="twitter:title"', 'name', 'twitter:title', title)
    updateMetaTag('name="twitter:description"', 'name', 'twitter:description', description)

    // JSON-LD Structured Data
    const jsonLdScriptId = 'seo-json-ld'
    let scriptElement = document.getElementById(jsonLdScriptId) as HTMLScriptElement | null

    const schemaData = jsonLd || {
      '@context': 'https://schema.org',
      '@type': 'Restaurant',
      name: 'Mareme Group — Kuliner & Makanan Hangat Murah Solo',
      description: DEFAULT_DESCRIPTION,
      url: currentUrl,
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Surakarta',
        addressRegion: 'Jawa Tengah',
        addressCountry: 'ID',
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: -7.5666,
        longitude: 110.8167,
      },
      servesCuisine: ['Indonesian', 'Warm Food', 'Soto', 'Bakmi', 'Coffee', 'Warm Indo'],
      priceRange: 'Rp',
      areaServed: ['Surakarta', 'Solo', 'Jawa Tengah'],
    }

    if (!scriptElement) {
      scriptElement = document.createElement('script')
      scriptElement.id = jsonLdScriptId
      scriptElement.type = 'application/ld+json'
      document.head.appendChild(scriptElement)
    }
    scriptElement.textContent = JSON.stringify(schemaData)
  }, [title, description, keywords, canonicalUrl, ogImage, ogType, jsonLd])

  return null
}
