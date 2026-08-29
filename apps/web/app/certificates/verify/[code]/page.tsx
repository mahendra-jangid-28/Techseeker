'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import {
  verifyCertificate,
  type CertificateVerifyResult,
} from '../../../../lib/api/certificates';
import { PageContainer, Card, Badge, Button, ContentCallout } from '@techseeker/ui';

export default function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const resolvedParams = use(params);
  const code = decodeURIComponent(resolvedParams.code);

  const [result, setResult] = useState<CertificateVerifyResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadVerification() {
      try {
        const res = await verifyCertificate(code);
        setResult(res);
      } catch {
        setResult({
          valid: false,
          verification_code: code,
          status: 'UNAVAILABLE',
        });
      } finally {
        setLoading(false);
      }
    }

    loadVerification();
  }, [code]);

  function handleCopyShareLink() {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handlePrint() {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-canvas">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  return (
    <PageContainer maxWidth="5xl" className="min-h-screen py-12 space-y-8">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between no-print">
        <Link href={'/' as Route} className="text-xs font-semibold text-content-muted hover:text-content-primary">
          ← Back to TechSeeker
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopyShareLink}
            className="text-xs"
          >
            {copied ? '✓ Link Copied' : '⎘ Share Link'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handlePrint}
            className="text-xs"
          >
            🖨 Print / Save PDF
          </Button>
        </div>
      </div>

      {result?.valid ? (
        /* Verified Certificate Canvas */
        <div className="relative overflow-hidden rounded-3xl border-2 border-brand-border bg-gradient-to-br from-surface-elevated via-surface to-surface p-8 sm:p-14 shadow-elevated space-y-8 text-center print:border-none print:shadow-none">
          {/* Watermark badge */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-subtle text-3xl text-brand border border-brand-border">
            🎖
          </div>

          <div className="space-y-2">
            <Badge variant="success" size="md" className="mx-auto">
              ✓ Officially Verified Credential
            </Badge>
            <h1 className="text-xs uppercase tracking-widest text-content-muted font-bold pt-2">
              TechSeeker Engineering Academy
            </h1>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-content-primary">
              Certificate of Mastery
            </h2>
          </div>

          <div className="space-y-2 max-w-xl mx-auto">
            <p className="text-xs text-content-muted">This certifies that</p>
            <h3 className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-sky-400 via-cyan-400 to-violet-400 bg-clip-text text-transparent">
              {result.recipient_name}
            </h3>
            <p className="text-xs text-content-secondary leading-relaxed pt-2">
              has successfully fulfilled all core architectural requirements and passed automated engineering evaluations for
            </p>
            <h4 className="text-base sm:text-xl font-bold text-content-primary pt-1">
              {result.course_name || result.title}
            </h4>
          </div>

          {/* Metadata Footer */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-8 border-t border-border-subtle text-xs text-left max-w-2xl mx-auto">
            <div>
              <span className="text-[10px] uppercase font-bold text-content-muted block">
                Verification Code
              </span>
              <span className="font-mono font-bold text-brand">{result.verification_code}</span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-content-muted block">
                Issue Date
              </span>
              <span className="text-content-secondary">
                {result.issue_date
                  ? new Date(result.issue_date).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'Verified'}
              </span>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <span className="text-[10px] uppercase font-bold text-content-muted block">
                Authority
              </span>
              <span className="text-content-secondary">TechSeeker AI Engine</span>
            </div>
          </div>
        </div>
      ) : (
        /* Invalid Certificate Notice */
        <Card variant="default" className="p-8 text-center space-y-4 max-w-md mx-auto">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 text-xl font-bold">
            ✗
          </div>
          <div>
            <h3 className="text-base font-bold text-content-primary">
              Certificate Not Found
            </h3>
            <p className="text-xs text-content-secondary mt-1">
              The verification code <code className="font-mono font-bold text-content-primary">{code}</code> could not be validated in the TechSeeker registry.
            </p>
          </div>
          <Link href={'/' as Route}>
            <Button variant="secondary" size="sm" className="mt-2">
              Return to Homepage
            </Button>
          </Link>
        </Card>
      )}
    </PageContainer>
  );
}
