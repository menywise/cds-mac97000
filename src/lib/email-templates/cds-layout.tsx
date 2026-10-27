import * as React from "react";

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

// Identité visuelle CDS pour les e-mails : thème clair uniquement,
// Police du système, couleur principale neutre du socle, cartes 12 px, boutons 6 px.

export const CDS_COLORS = {
  background: "#f8fafc",
  surface: "#ffffff",
  text: "#1e293b",
  textLight: "#5b6472",
  border: "#e5e7eb",
  primary: "#334155",
  primaryText: "#334155",
} as const;

interface CdsEmailLayoutProps {
  preview: string;
  title: string;
  siteName: string;
  siteUrl: string;
  children: React.ReactNode;
}

export const CdsEmailLayout = ({
  preview,
  title,
  siteName,
  siteUrl,
  children,
}: CdsEmailLayoutProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>{preview}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={card}>
          <Text style={brand}>
            <Link href={siteUrl} style={brandLink}>
              {siteName}
            </Link>
          </Text>
          <Heading style={h1}>{title}</Heading>
          {children}
        </Section>
        <Text style={footer}>
          {siteName} —{" "}
          <Link href={siteUrl} style={footerLink}>
            {siteUrl.replace(/^https?:\/\//, "")}
          </Link>
        </Text>
      </Container>
    </Body>
  </Html>
);

interface CdsButtonProps {
  href: string;
  children: React.ReactNode;
}

export const CdsButton = ({ href, children }: CdsButtonProps) => (
  <Button style={button} href={href}>
    {children}
  </Button>
);

export const CdsParagraph = ({ children }: { children: React.ReactNode }) => (
  <Text style={text}>{children}</Text>
);

export const CdsNote = ({ children }: { children: React.ReactNode }) => (
  <Text style={note}>{children}</Text>
);

const main = {
  backgroundColor: CDS_COLORS.background,
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  margin: "0",
  padding: "24px 0",
};
const container = { margin: "0 auto", maxWidth: "560px", padding: "0 12px" };
const card = {
  backgroundColor: CDS_COLORS.surface,
  border: `1px solid ${CDS_COLORS.border}`,
  borderRadius: "12px",
  padding: "32px 28px",
};
const brand = {
  fontSize: "13px",
  fontWeight: 600 as const,
  letterSpacing: "0.02em",
  margin: "0 0 16px",
  textTransform: "uppercase" as const,
};
const brandLink = { color: CDS_COLORS.primaryText, textDecoration: "none" };
const h1 = {
  color: CDS_COLORS.text,
  fontSize: "22px",
  fontWeight: 700 as const,
  lineHeight: "1.3",
  margin: "0 0 16px",
};
const text = {
  color: CDS_COLORS.text,
  fontSize: "15px",
  lineHeight: "1.6",
  margin: "0 0 16px",
};
const note = {
  color: CDS_COLORS.textLight,
  fontSize: "13px",
  lineHeight: "1.5",
  margin: "20px 0 0",
};
const button = {
  backgroundColor: CDS_COLORS.primary,
  borderRadius: "6px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "15px",
  fontWeight: 600 as const,
  padding: "12px 24px",
  textDecoration: "none",
};
const footer = {
  color: CDS_COLORS.textLight,
  fontSize: "12px",
  margin: "16px 0 0",
  textAlign: "center" as const,
};
const footerLink = { color: CDS_COLORS.textLight, textDecoration: "underline" };
