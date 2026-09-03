'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { ArrowRight, BadgeCheck, Barcode, Camera, Check, ChevronDown, CircleDollarSign, Clock3, Code2, Globe2, MapPin, Plus, Search, ShieldCheck, ShoppingBasket, Sparkles, Store, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Product = { code: string; name: string; quantity?: string; image?: string };
type PriceReport = { id: string; barcode: string; store: string; price: number; currency: string; createdAt: string };

const regionCurrencies: Record<string, string> = {
  SA: 'SAR', AE: 'AED', GB: 'GBP', US: 'USD', CA: 'CAD', AU: 'AUD',
  IN: 'INR', PK: 'PKR', JP: 'JPY', CN: 'CNY', CH: 'CHF',
  DE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR', IE: 'EUR',
};

export default function Home() {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [contributeOpen, setContributeOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [notice, setNotice] = useState('');
  const [barcode, setBarcode] = useState('');
  const [product, setProduct] = useState<Product | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [currency, setCurrency] = useState('USD');
  const [reports, setReports] = useState<PriceReport[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerControlsRef = useRef<IScannerControls | null>(null);
  const scanHandledRef = useRef(false);

  function stopCamera() {
    scannerControlsRef.current?.stop();
    scannerControlsRef.current = null;
    setCameraActive(false);
  }

  async function startCamera() {
    setCameraError('');
    scanHandledRef.current = false;
    try {
      if (!videoRef.current) throw new Error('Scanner is not ready');
      const reader = new BrowserMultiFormatReader();
      scannerControlsRef.current = await reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
        if (result && !scanHandledRef.current) {
          scanHandledRef.current = true;
          const value = result.getText();
          stopCamera();
          setScannerOpen(false);
          void lookupProduct(value);
        }
      });
      setCameraActive(true);
    } catch {
      setCameraError('We could not access your camera. You can enter the barcode manually.');
    }
  }

  function openScanner() {
    setScannerOpen(true);
    setTimeout(startCamera, 120);
  }

  function closeScanner() {
    stopCamera();
    setScannerOpen(false);
  }

  async function scanImage(file: File) {
    setCameraError('');
    try {
      const reader = new BrowserMultiFormatReader();
      const imageUrl = URL.createObjectURL(file);
      const result = await reader.decodeFromImageUrl(imageUrl);
      URL.revokeObjectURL(imageUrl);
      closeScanner();
      await lookupProduct(result.getText());
    } catch {
      setCameraError('No barcode was found in that image. Try a sharper, closer photo.');
    }
  }

  async function lookupProduct(code: string) {
    const cleanCode = code.replace(/\D/g, '');
    if (!cleanCode) return;
    setLookupLoading(true);
    setNotice('Looking up product…');
    try {
      const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${cleanCode}.json`);
      const data = await response.json() as {
        status: number;
        product?: {
          product_name?: string;
          product_name_en?: string;
          quantity?: string;
          image_front_small_url?: string;
          image_front_url?: string;
        };
      };
      if (data.status === 1 && data.product) {
        setProduct({
          code: cleanCode,
          name: data.product.product_name || data.product.product_name_en || `Product ${cleanCode}`,
          quantity: data.product.quantity,
          image: data.product.image_front_small_url || data.product.image_front_url,
        });
        setNotice('Product found. Add or view a local price below.');
      } else {
        setProduct({ code: cleanCode, name: 'Unknown product' });
        setNotice('Barcode scanned. This product is not yet in the open catalogue.');
      }
      document.getElementById('prices')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch {
      setProduct({ code: cleanCode, name: 'Product lookup unavailable' });
      setNotice('Barcode scanned, but product details could not be loaded.');
    } finally {
      setLookupLoading(false);
      setTimeout(() => setNotice(''), 4200);
    }
  }

  function findProduct() {
    if (!barcode.trim()) return;
    setManualOpen(false);
    const value = barcode;
    setBarcode('');
    void lookupProduct(value);
  }

  function submitPrice(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!product) return;
    const form = new FormData(event.currentTarget);
    const priceValue = form.get('price');
    const currencyValue = form.get('currency');
    const storeValue = form.get('store');
    if (typeof priceValue !== 'string' || typeof currencyValue !== 'string' || typeof storeValue !== 'string') return;
    const next: PriceReport = {
      id: crypto.randomUUID(),
      barcode: product.code,
      price: Number(priceValue),
      currency: currencyValue,
      store: storeValue,
      createdAt: new Date().toISOString(),
    };
    const updated = [next, ...reports];
    setReports(updated);
    localStorage.setItem('pricelens-reports', JSON.stringify(updated));
    setContributeOpen(false);
    setNotice('Price saved on this device. Community sync is the next milestone.');
    setTimeout(() => setNotice(''), 3800);
  }

  useEffect(() => {
    const region = navigator.language.split('-')[1]?.toUpperCase();
    if (region && regionCurrencies[region]) setCurrency(regionCurrencies[region]);
    try {
      const saved = JSON.parse(localStorage.getItem('pricelens-reports') || '[]');
      if (Array.isArray(saved)) setReports(saved);
    } catch {}
    return () => stopCamera();
  }, []);

  const productReports = product ? reports.filter((report) => report.barcode === product.code) : [];
  const formatMoney = (value: number, code: string) =>
    new Intl.NumberFormat(undefined, { style: 'currency', currency: code }).format(value);

  return (
    <main className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-[#f7faf9]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8">
          <a href="#top" className="flex items-center gap-2.5" aria-label="PriceLens home">
            <span className="grid size-10 place-items-center rounded-[14px] bg-[#163f39] text-[#bafa5f] shadow-[0_8px_22px_rgba(22,63,57,.22)]"><Barcode className="size-5" strokeWidth={2.4} /></span>
            <span className="font-display text-xl font-bold tracking-[-0.035em]">PriceLens</span>
          </a>
          <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-600 md:flex" aria-label="Main navigation">
            <a className="transition hover:text-[#163f39]" href="#how">How it works</a>
            <a className="transition hover:text-[#163f39]" href="#community">Community</a>
            <a className="flex items-center gap-1 transition hover:text-[#163f39]" href="#global"><Globe2 className="size-4" /> Global <ChevronDown className="size-3.5" /></a>
          </nav>
          <a href="https://github.com/thefranchisist/PriceLens" target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-300 bg-white px-4 text-sm font-bold shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400"><Code2 className="size-4" /> <span className="hidden sm:inline">Open source</span></a>
        </div>
      </header>

      <section id="top" className="relative">
        <div className="hero-grid absolute inset-0 opacity-50" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 pb-16 pt-14 sm:px-8 lg:grid-cols-[1.06fr_.94fr] lg:items-center lg:pb-24 lg:pt-20">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#b8dccf] bg-[#ecf8f3] px-3.5 py-2 text-xs font-bold text-[#245f53]"><Sparkles className="size-3.5" /> Know the price before checkout</div>
            <h1 className="font-display text-[clamp(3.2rem,8vw,6.3rem)] font-bold leading-[.9] tracking-[-.07em] text-[#112e2a]">Scan it.<br />Price it.<br /><span className="text-[#528b33]">Shop smarter.</span></h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600 sm:text-xl">Point your camera at any supermarket barcode. See recent prices nearby, compare stores, and never hunt for a price checker again.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button onClick={openScanner} className="h-14 rounded-full bg-[#163f39] px-7 text-base font-bold text-white shadow-[0_16px_35px_rgba(22,63,57,.24)] hover:bg-[#20564d]"><Camera className="mr-1 size-5" /> Scan a barcode</Button>
              <Button onClick={() => setManualOpen(true)} variant="outline" className="h-14 rounded-full border-slate-300 bg-white px-7 text-base font-bold hover:bg-slate-50"><Search className="mr-1 size-5" /> Enter barcode</Button>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-slate-500">
              <span className="flex items-center gap-1.5"><Check className="size-4 text-[#528b33]" /> No account needed</span>
              <span className="flex items-center gap-1.5"><Check className="size-4 text-[#528b33]" /> Free & open source</span>
              <span className="flex items-center gap-1.5"><Check className="size-4 text-[#528b33]" /> Works worldwide</span>
            </div>
          </div>

          <div id="prices" className="relative mx-auto w-full max-w-[510px]">
            <div className="absolute -left-9 top-14 hidden rotate-[-6deg] rounded-2xl bg-[#c9fb74] px-4 py-3 text-sm font-black text-[#163f39] shadow-lg lg:block">{product ? 'Live product result' : 'Ready for your first scan'}</div>
            <div className="overflow-hidden rounded-[32px] border border-white/80 bg-white shadow-[0_30px_80px_rgba(26,61,54,.16)]">
              <div className="border-b border-slate-100 bg-[#f0f6f4] p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    {product?.image ? <img src={product.image} alt="" className="size-14 shrink-0 rounded-2xl bg-white object-contain shadow-sm" /> : <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white text-[#528b33] shadow-sm"><Barcode className="size-7" /></div>}
                    <div className="min-w-0"><p className="truncate text-base font-extrabold text-[#112e2a]">{lookupLoading ? 'Looking up product…' : product?.name || 'Scan a supermarket product'}</p><p className="mt-1 text-sm text-slate-500">{product ? [product.quantity, `Barcode ${product.code}`].filter(Boolean).join(' · ') : 'Its real product details will appear here'}</p></div>
                  </div>
                  <span className="shrink-0 rounded-full bg-[#dff7d2] px-2.5 py-1 text-xs font-bold text-[#397328]">{productReports.length} saved</span>
                </div>
              </div>
              <div className="p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between px-1"><p className="text-xs font-bold uppercase tracking-[.15em] text-slate-400">Your price reports</p><span className="text-xs font-bold text-[#397328]">{currency}</span></div>
                <div className="space-y-2.5">
                  {productReports.map((item) => (
                    <div key={item.id} className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-2xl border border-[#a7d998] bg-[#f5fbf1] p-4">
                      <div><p className="font-extrabold text-[#173e38]">{item.store}</p><p className="mt-1 text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</p><p className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-[#528b33]"><BadgeCheck className="size-3.5" /> Saved on this device</p></div>
                      <p className="font-display text-2xl font-bold tracking-tight text-[#112e2a]">{formatMoney(item.price, item.currency)}</p>
                    </div>
                  ))}
                  {!product && <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center"><Camera className="mx-auto size-7 text-[#528b33]" /><p className="mt-3 font-bold text-[#173e38]">No demonstration prices</p><p className="mt-1 text-sm leading-6 text-slate-500">Scan or enter a real barcode to begin.</p></div>}
                  {product && productReports.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center"><p className="font-bold text-[#173e38]">No prices saved for this product yet</p><p className="mt-1 text-sm leading-6 text-slate-500">Add the shelf price you can see. Global community storage is coming next.</p></div>}
                </div>
                <button disabled={!product} onClick={() => setContributeOpen(true)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 py-3.5 text-sm font-bold text-slate-600 transition hover:border-[#528b33] hover:bg-[#f5fbf1] hover:text-[#397328] disabled:cursor-not-allowed disabled:opacity-45"><Plus className="size-4" /> Add a price for this product</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="bg-[#112e2a] px-5 py-20 text-white sm:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
            <div><p className="mb-4 text-xs font-black uppercase tracking-[.2em] text-[#c9fb74]">Less guessing. Less waiting.</p><h2 className="font-display text-4xl font-bold leading-tight tracking-[-.05em] sm:text-5xl">Made for the moment the shelf tells you nothing.</h2></div>
            <p className="max-w-2xl text-lg leading-8 text-[#b9d0ca] lg:justify-self-end">Missing labels, broken price checkers, confusing offers, and no staff nearby shouldn’t turn a quick shop into detective work.</p>
          </div>
          <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {([
              [Camera, 'Scan instantly', 'Use the camera already in your pocket—no special app or store device.'],
              [MapPin, 'See local prices', 'Results are tied to real branches, with distance and update time.'],
              [CircleDollarSign, 'Compare fairly', 'Unit prices make different pack sizes and promotions easy to compare.'],
              [Users, 'Keep it honest', 'Shoppers confirm prices and evidence raises confidence for everyone.'],
            ] as const).map(([FeatureIcon, title, copy], index) => (
              <article key={title} className="rounded-[24px] border border-white/10 bg-white/[.055] p-6">
                <div className="mb-8 flex items-center justify-between"><span className="grid size-11 place-items-center rounded-2xl bg-[#c9fb74] text-[#163f39]"><FeatureIcon className="size-5" /></span><span className="font-mono text-xs text-white/35">0{index + 1}</span></div>
                <h3 className="text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-[#a9c1bb]">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="community" className="px-5 py-20 sm:px-8 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#edf7e8] px-3 py-2 text-xs font-bold text-[#397328]"><ShieldCheck className="size-4" /> Community-powered, privacy-minded</span>
            <h2 className="mt-5 max-w-xl font-display text-4xl font-bold leading-tight tracking-[-.055em] text-[#112e2a] sm:text-5xl">A global price map built one helpful scan at a time.</h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">Browse without an account. Share a shelf price in seconds. Every contribution helps a parent, student, traveller, or budget-conscious shopper nearby.</p>
            <div className="mt-8 flex flex-wrap gap-3"><Button onClick={() => setContributeOpen(true)} className="h-12 rounded-full bg-[#163f39] px-6 font-bold text-white hover:bg-[#20564d]">Contribute a price <ArrowRight className="ml-1 size-4" /></Button><a href="https://github.com/thefranchisist/PriceLens" target="_blank" rel="noreferrer" className="inline-flex h-12 items-center gap-2 rounded-full border border-slate-300 bg-white px-6 text-sm font-bold"><Code2 className="size-4" /> Build with us</a></div>
          </div>
          <div id="global" className="grid grid-cols-2 gap-3">
            {([
              [Globe2, 'Any country', 'Local currency and language'],
              [Clock3, 'Freshness first', 'Every price is timestamped'],
              [ShoppingBasket, 'Basket savings', 'Compare the whole shop'],
              [Store, 'Branch-level', 'Because prices vary by location'],
            ] as const).map(([TileIcon, title, copy]) => <div key={title} className="min-h-48 rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(22,63,57,.07)] sm:p-6"><TileIcon className="size-7 text-[#528b33]" /><p className="mt-9 text-lg font-extrabold text-[#112e2a]">{title}</p><p className="mt-1 text-sm leading-6 text-slate-500">{copy}</p></div>)}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 px-5 py-8 sm:px-8"><div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left"><div className="flex items-center gap-2 font-display font-bold text-[#112e2a]"><Barcode className="size-5" /> PriceLens</div><p className="text-sm text-slate-500">Open prices for everyone, everywhere.</p><div className="flex gap-5 text-sm font-semibold text-slate-500"><a href="https://github.com/thefranchisist/PriceLens" target="_blank" rel="noreferrer">GitHub</a><a href="#community">Contribute</a></div></div></footer>

      {notice && <div role="status" className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#112e2a] px-5 py-3 text-sm font-bold text-white shadow-2xl"><Check className="size-4 text-[#c9fb74]" /> {notice}</div>}

      {scannerOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#071916]/90 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="scanner-title">
          <div className="w-full max-w-md overflow-hidden rounded-[28px] bg-white shadow-2xl">
            <div className="flex items-center justify-between p-5"><div><h2 id="scanner-title" className="text-xl font-extrabold text-[#112e2a]">Scan a product</h2><p className="mt-1 text-sm text-slate-500">Hold the barcode inside the frame</p></div><button onClick={closeScanner} className="grid size-10 place-items-center rounded-full bg-slate-100" aria-label="Close scanner"><X className="size-5" /></button></div>
            <div className="relative mx-5 aspect-[4/5] overflow-hidden rounded-[22px] bg-[#0d2722]">
              <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
              {!cameraActive && <div className="absolute inset-0 grid place-items-center px-8 text-center text-white"><div><Camera className="mx-auto size-10 text-[#c9fb74]" /><p className="mt-4 text-sm text-white/70">Allow camera access to start scanning.</p>{cameraError && <p className="mt-3 text-sm font-semibold text-[#ffd6c9]">{cameraError}</p>}</div></div>}
              <div className="pointer-events-none absolute inset-x-10 top-1/2 h-32 -translate-y-1/2 rounded-2xl border-2 border-[#c9fb74] shadow-[0_0_0_999px_rgba(3,17,14,.28)]"><div className="scan-line absolute inset-x-3 top-1/2 h-px bg-[#c9fb74] shadow-[0_0_12px_#c9fb74]" /></div>
            </div>
            <div className="grid gap-3 p-5 sm:grid-cols-2">
              <label className="flex h-11 cursor-pointer items-center justify-center rounded-xl border border-slate-300 text-center text-sm font-bold text-[#397328]">Scan a saved photo<input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(event) => event.target.files?.[0] && void scanImage(event.target.files[0])} /></label>
              <button onClick={() => { closeScanner(); setManualOpen(true); }} className="h-11 rounded-xl bg-slate-100 text-center text-sm font-bold text-[#397328]">Enter barcode manually</button>
            </div>
          </div>
        </div>
      )}

      {manualOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#071916]/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="manual-title">
          <div className="w-full max-w-md rounded-[26px] bg-white p-6 shadow-2xl">
            <div className="flex justify-between"><div><h2 id="manual-title" className="text-xl font-extrabold text-[#112e2a]">Enter the barcode</h2><p className="mt-1 text-sm text-slate-500">Usually 8–14 digits under the bars.</p></div><button onClick={() => setManualOpen(false)} aria-label="Close"><X className="size-5" /></button></div>
            <label className="mt-6 block text-sm font-bold text-slate-700" htmlFor="barcode">Barcode number</label>
            <Input id="barcode" inputMode="numeric" autoFocus value={barcode} onChange={(e) => setBarcode(e.target.value.replace(/\D/g, ''))} onKeyDown={(e) => e.key === 'Enter' && findProduct()} placeholder="e.g. 5000112637922" className="mt-2 h-12 rounded-xl text-base" />
            <Button onClick={findProduct} disabled={!barcode} className="mt-4 h-12 w-full rounded-xl bg-[#163f39] font-bold text-white">Find prices</Button>
          </div>
        </div>
      )}

      {contributeOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#071916]/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="contribute-title">
          <form onSubmit={submitPrice} className="my-4 w-full max-w-lg rounded-[26px] bg-white p-6 shadow-2xl">
            <div className="flex justify-between"><div><h2 id="contribute-title" className="text-xl font-extrabold text-[#112e2a]">Share a price</h2><p className="mt-1 text-sm text-slate-500">Help the next shopper know before checkout.</p></div><button type="button" onClick={() => setContributeOpen(false)} aria-label="Close"><X className="size-5" /></button></div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-bold text-slate-700">Price<Input name="price" required min="0" step="0.01" inputMode="decimal" placeholder="0.00" className="mt-2 h-11" /></label>
              <label className="text-sm font-bold text-slate-700">Currency<select name="currency" value={currency} onChange={(event) => setCurrency(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 font-normal"><option value="USD">USD — $</option><option value="EUR">EUR — €</option><option value="GBP">GBP — £</option><option value="SAR">SAR — ﷼</option><option value="AED">AED</option><option value="INR">INR — ₹</option><option value="CAD">CAD</option><option value="AUD">AUD</option><option value="PKR">PKR</option><option value="JPY">JPY — ¥</option><option value="CNY">CNY — ¥</option><option value="CHF">CHF</option></select></label>
              <label className="text-sm font-bold text-slate-700 sm:col-span-2">Store and branch<Input name="store" required placeholder="Store name, neighbourhood or branch" className="mt-2 h-11" /></label>
              <label className="text-sm font-bold text-slate-700 sm:col-span-2">Optional proof<span className="mt-2 flex h-20 items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm font-semibold text-slate-500"><Camera className="size-4" /> Add shelf-label photo</span></label>
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-500">Please share only the shelf price—avoid faces, payment details, or other personal information.</p>
            <Button type="submit" className="mt-5 h-12 w-full rounded-xl bg-[#163f39] font-bold text-white">Submit for verification</Button>
          </form>
        </div>
      )}
    </main>
  );
}
