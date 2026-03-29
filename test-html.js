const fs = require('fs');
async function test() {
  const resp = await fetch('https://www.youtube.com/@3blue1brown');
  const html = await resp.text();
  
  const idMatch = html.match(/"channelId":"(UC[a-zA-Z0-9_-]{22})"/);
  const avatarMatch = html.match(/<meta property="og:image"\s+content="([^"]+)"/);
  // checking verified
  const isVerified = html.includes('"iconType":"CHECK_CIRCLE_THICK"');
  
  console.log("ID:", idMatch ? idMatch[1] : "none");
  console.log("Avatar:", avatarMatch ? avatarMatch[1] : "none");
  console.log("Verified:", isVerified);
}
test();
