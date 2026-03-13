const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxrZGJpbnJ3b2p2cmNodW56cWZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTU1MTk0NSwiZXhwIjoyMDg1MTI3OTQ1fQ.lRXFxyhFIENlb6mRewI229WZ1LKrmjEDlhzyHhlHp3A";
const baseUrl = "https://lkdbinrwojvrchunzqfq.supabase.co/rest/v1/lessons";

const urlBlocks = `${baseUrl}?select=*,blocks:lesson_blocks(*)&id=eq.b2aa3474-93b9-4db5-b62c-7c646d42062b`;
fetch(urlBlocks, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } })
  .then(res => res.text().then(text => console.log("Blocks Test:", res.status, text)))
  .catch(console.error);

const urlSubjects = `${baseUrl}?select=*,subject:subjects(*,stage:stages(*))&id=eq.b2aa3474-93b9-4db5-b62c-7c646d42062b`;
fetch(urlSubjects, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } })
  .then(res => res.text().then(text => console.log("Subjects Test:", res.status, text.substring(0, 100))))
  .catch(console.error);
