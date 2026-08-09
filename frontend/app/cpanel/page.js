"use client"
import React from 'react'
import { withAdminAuth } from '../Components/auth-protection'

const CpanelPage = () => {
  const token = localStorage.getItem('token');

  return (
    <div className='text-black pl-20'>
      <div className='font-bold text-center text-xl m-2'>
        Welcome to VIT Bhopal Campus Navigator Admin Control Panel
      </div>
    </div>
  )
}

export default withAdminAuth(CpanelPage);
