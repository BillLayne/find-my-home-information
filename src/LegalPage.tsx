import { useEffect } from "react";
import { ArrowLeft, FileText, Home, Mail, Phone, ShieldCheck } from "lucide-react";

type LegalPageKind = "privacy" | "terms";

const EFFECTIVE_DATE = "July 15, 2026";

function LegalHeader() {
  return (
    <header className="site-header">
      <a className="brand" href="/" aria-label="Find My Home Information home">
        <span className="brand-mark"><Home size={20} /></span>
        <span><strong>Bill Layne Insurance</strong><small>Find My Home Information</small></span>
      </a>
      <div className="header-actions">
        <a href="tel:3368351993"><Phone size={16} />336-835-1993</a>
        <a href="mailto:save@billlayneinsurance.com"><Mail size={16} />Email Agency</a>
      </div>
    </header>
  );
}

function LegalFooter() {
  return (
    <footer>
      <strong>Bill Layne Insurance Agency</strong>
      <span>1283 N Bridge St, Elkin, NC 28621</span>
      <nav className="footer-links" aria-label="Legal information">
        <a href="/privacy">Privacy Notice</a>
        <a href="/terms">Terms of Use</a>
        <a href="https://www.billlayneinsurance.com/">Agency Website</a>
      </nav>
      <span>Public records can be incomplete or outdated. This tool is not a title search, survey, flood determination, appraisal, or guarantee of insurance eligibility.</span>
    </footer>
  );
}

function PrivacyContent() {
  return (
    <>
      <section>
        <h2>What this resource does</h2>
        <p>Find My Home Information helps visitors locate publicly available North Carolina property facts and links to county records, maps, photographs, and hazard resources. No account is required.</p>
      </section>
      <section>
        <h2>Information used for a search</h2>
        <p>When you enter a property address, the address is sent to our server and our property-information service so the requested lookup can be completed. Search results may include public facts such as the parcel number, year built, acreage, assessed value, building area, and links to the appropriate public or third-party resources.</p>
        <p>The consumer response is designed to omit property-owner names, owner mailing addresses, agency customer records, staff notes, uploaded documents, and other private agency information.</p>
      </section>
      <section>
        <h2>Storage and technical logs</h2>
        <p>We do not create a customer profile or maintain an application database of the addresses searched on this site. Search responses are marked not to be cached by the application.</p>
        <p>Like most websites, our hosting, security, and network providers may temporarily process technical information such as an IP address, browser type, request time, requested page, and diagnostic or security logs. This information may be used to operate, secure, troubleshoot, and prevent abuse of the service.</p>
      </section>
      <section>
        <h2>Cookies, advertising, and sale of information</h2>
        <p>This application does not use advertising cookies, build advertising profiles, or sell the address you enter. Essential hosting or security technologies may be used when necessary to deliver and protect the site.</p>
      </section>
      <section>
        <h2>Public records and outside websites</h2>
        <p>The site links to county agencies and services such as mapping, flood, real-estate, and public-record websites. Those organizations operate independently and apply their own privacy practices. Opening an outside link takes you away from this site.</p>
      </section>
      <section>
        <h2>Your choices</h2>
        <p>You may use the public links without contacting the agency. Do not enter Social Security numbers, dates of birth, financial account numbers, medical information, or other sensitive personal information in the address field.</p>
        <p>Questions about this notice or the information shown by the resource may be sent to <a href="mailto:save@billlayneinsurance.com">save@billlayneinsurance.com</a> or discussed by calling <a href="tel:3368351993">336-835-1993</a>.</p>
      </section>
      <section>
        <h2>Updates to this notice</h2>
        <p>We may update this notice as the resource or its service providers change. The effective date at the top identifies the current version.</p>
      </section>
    </>
  );
}

function TermsContent() {
  return (
    <>
      <section>
        <h2>Informational resource</h2>
        <p>Find My Home Information is a free research resource provided by Bill Layne Insurance Agency. It organizes publicly available property facts and links for convenience. Using the resource does not create an insurance-agent relationship, bind coverage, change a policy, or constitute an insurance application.</p>
      </section>
      <section>
        <h2>No professional determination</h2>
        <p>The information is not a title search, legal opinion, survey, appraisal, replacement-cost estimate, home inspection, flood determination, tax advice, or guarantee of insurance eligibility. Contact the appropriate licensed professional or government office when an authoritative determination is required.</p>
      </section>
      <section>
        <h2>Accuracy and availability</h2>
        <p>Property records and third-party services may be incomplete, delayed, unavailable, or incorrect. Verify important details with the county or other original source. The resource is provided on an "as available" basis without a guarantee that every address, county, record, or link will work at all times.</p>
      </section>
      <section>
        <h2>Insurance decisions</h2>
        <p>Results do not determine whether a property qualifies for insurance or what coverage or price may be available. Insurers may require additional applications, inspections, reports, consumer information, underwriting review, and verification.</p>
      </section>
      <section>
        <h2>Acceptable use</h2>
        <p>You may use this site for ordinary personal property research. You may not attempt to gain unauthorized access, disrupt the service, evade security controls, submit automated high-volume searches, harvest information in bulk, or use the site in violation of law or a source website's terms.</p>
      </section>
      <section>
        <h2>Third-party links and names</h2>
        <p>Links to counties, government agencies, mapping providers, and real-estate services are provided for convenience. Bill Layne Insurance Agency is not affiliated with or endorsed by those organizations unless expressly stated. Product and organization names belong to their respective owners.</p>
      </section>
      <section>
        <h2>Limitation of responsibility</h2>
        <p>To the extent permitted by law, Bill Layne Insurance Agency is not responsible for losses caused by reliance on inaccurate or unavailable public information, the operation of an outside website, or unauthorized misuse of this resource. Nothing in these terms limits rights that cannot legally be limited.</p>
      </section>
      <section>
        <h2>Changes and contact</h2>
        <p>We may update the resource or these terms. Continued use after an update is subject to the current terms. These terms are governed by North Carolina law. Questions may be sent to <a href="mailto:save@billlayneinsurance.com">save@billlayneinsurance.com</a> or discussed by calling <a href="tel:3368351993">336-835-1993</a>.</p>
      </section>
    </>
  );
}

export function LegalPage({ kind }: { kind: LegalPageKind }) {
  const privacy = kind === "privacy";
  const title = privacy ? "Privacy Notice" : "Terms of Use";
  const Icon = privacy ? ShieldCheck : FileText;

  useEffect(() => {
    document.title = `${title} | Find My Home Information`;
  }, [title]);

  return (
    <div className="app-shell legal-shell">
      <LegalHeader />
      <main className="legal-main">
        <a className="back-link" href="/"><ArrowLeft size={17} />Back to property search</a>
        <article className="legal-document">
          <header className="legal-title">
            <span className="legal-title-icon"><Icon size={26} /></span>
            <div>
              <p>Find My Home Information</p>
              <h1>{title}</h1>
              <span>Effective {EFFECTIVE_DATE}</span>
            </div>
          </header>
          <div className="legal-summary">
            {privacy
              ? "We designed this public property resource to work without customer accounts, owner profiles, or a saved application history of address searches."
              : "Please use this resource as a convenient starting point and verify important property information with the original public source."}
          </div>
          <div className="legal-content">
            {privacy ? <PrivacyContent /> : <TermsContent />}
          </div>
        </article>
      </main>
      <LegalFooter />
    </div>
  );
}
