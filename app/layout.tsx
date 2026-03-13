import type { Metadata } from "next";
import Providers from "./providers";
import "./globals.css";

export const metadata: Metadata = {
    title: "Zyntra – Adaptive Metabolic Intelligence",
    description:
        "Secure infrastructure layer for metabolic and wearable signal ingestion, baseline computation, and predictive risk scoring.",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
