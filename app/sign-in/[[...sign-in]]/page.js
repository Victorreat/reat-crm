import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f0edd8',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '32px'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: '28px', color: '#316828', letterSpacing: '-0.5px' }}>REAT Commercial</div>
        <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>CRM Portal</div>
      </div>
      <SignIn />
    </div>
  )
}
