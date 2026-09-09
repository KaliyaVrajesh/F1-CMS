import { useEffect } from 'react';

/**
 * SEOHead — Dynamically sets document <head> metadata for SEO, Open Graph, and Twitter Cards.
 * 
 * Usage: <SEOHead title="Page Title" description="..." />
 * 
 * For admin pages, pass noIndex={true} to prevent search engine indexing.
 */
const SEOHead = ({
  title = 'F1 CMS',
  description = 'Your ultimate Formula 1 content hub — live race data, championship standings, driver profiles, circuit maps, legends, and predictions.',
  canonicalPath = '',
  ogType = 'website',
  ogImage = '/images/f1-og-default.jpg',
  noIndex = false,
  schemaData = null,
}) => {
  const siteUrl = 'https://f1-cms.vercel.app';
  const siteName = 'F1 CMS — Formula 1 Hub';
  const fullTitle = title === 'F1 CMS' ? title : `${title} | F1 CMS`;
  const canonicalUrl = `${siteUrl}${canonicalPath}`;

  useEffect(() => {
    // Title
    document.title = fullTitle;

    // Helper: set or create a meta tag
    const setMeta = (attr, attrValue, content) => {
      let el = document.querySelector(`meta[${attr}="${attrValue}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, attrValue);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    // Standard meta
    setMeta('name', 'description', description);
    setMeta('name', 'robots', noIndex ? 'noindex, nofollow' : 'index, follow');
    setMeta('name', 'theme-color', '#E10600');

    // Open Graph
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:type', ogType);
    setMeta('property', 'og:url', canonicalUrl);
    setMeta('property', 'og:image', ogImage.startsWith('http') ? ogImage : `${siteUrl}${ogImage}`);
    setMeta('property', 'og:site_name', siteName);

    // Twitter Card
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', ogImage.startsWith('http') ? ogImage : `${siteUrl}${ogImage}`);

    // Canonical URL
    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', canonicalUrl);

    // Schema.org JSON-LD
    const schemaId = 'seo-schema-jsonld';
    let scriptEl = document.getElementById(schemaId);
    if (schemaData) {
      if (!scriptEl) {
        scriptEl = document.createElement('script');
        scriptEl.id = schemaId;
        scriptEl.type = 'application/ld+json';
        document.head.appendChild(scriptEl);
      }
      scriptEl.textContent = JSON.stringify(schemaData);
    } else if (scriptEl) {
      scriptEl.remove();
    }

    // Cleanup: remove schema on unmount
    return () => {
      const el = document.getElementById(schemaId);
      if (el) el.remove();
    };
  }, [fullTitle, description, canonicalUrl, ogType, ogImage, noIndex, schemaData]);

  return null;
};

export default SEOHead;
