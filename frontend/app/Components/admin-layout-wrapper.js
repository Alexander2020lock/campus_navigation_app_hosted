"use client"
import Adminnav from "./Adminnav";
import Adminside from "./Adminside";

export default function AdminLayoutWrapper({ children }) {
  return (
    <>
      <Adminnav />
      <Adminside />
      {children}
    </>
  );
}
