export default function handler(req, res) {
  // Clear the session cookie
  res.setHeader('Set-Cookie', 'session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
  
  // Redirect to home or return JSON based on request
  if (req.headers.accept?.includes('application/json')) {
    return res.status(200).json({ success: true });
  }
  
  res.redirect(302, '/');
}
