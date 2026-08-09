import { Geist, Geist_Mono } from "next/font/google";
import AdminLayoutWrapper from "../Components/admin-layout-wrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Campus Navigator | VIT Bhopal",
  description: "This is a campus navigator app for the students of vit bhopal",
};

export default function RootLayout({ children }) {
  return (
    <AdminLayoutWrapper>
      {children}
    </AdminLayoutWrapper>
  );
}
