const menu = document.querySelector('.menu');
const nav = document.querySelector('#navigation');
menu?.addEventListener('click', () => { const open = menu.getAttribute('aria-expanded') !== 'true'; menu.setAttribute('aria-expanded', String(open)); nav.classList.toggle('open', open); });
nav?.addEventListener('click', e => { if(e.target.closest('a')) { nav.classList.remove('open'); menu.setAttribute('aria-expanded','false'); } });
document.addEventListener('keydown', e => { if(e.key === 'Escape' && nav?.classList.contains('open')) { nav.classList.remove('open'); menu.setAttribute('aria-expanded','false'); menu.focus(); } });
const documents = [
 ['Architectural review application','Before planning an exterior change','forms','wp-content__uploads__2025__08__kmca-architectural-review-form-application-newest-use.pdf'],
 ['Payment agreement form','Request a payment arrangement','forms','wp-content__uploads__2026__02__paymentagreementform.pdf'],
 ['Community guidelines','For owners & property managers','governance','wp-content__uploads__2026__05__kenswick-meadows-community-guidelines-to-owner-prop-management-revised-website.pdf'],
 ['KMCA covenants','Published governing document','governance','wp-content__uploads__2026__09__kmca-covenants.pdf'],
 ['Violation fine schedule','Revised 2026 · published PDF','governance','wp-content__uploads__2026__02__kmca-violations-ccr-fines_revised-2026.docx.pdf'],
 ['Supplemental notice of dedicatory instruments','Published association record','governance','wp-content__uploads__2025__09__supplemental-notice-of-dedicatory-instruments_removed.pdf'],
 ['Community newsletter','From the association’s newsletter page','news','wp-content__uploads__2026__05__kenswick-meadows-community-assoc.-newsletter.pdf']
];
let filter = 'all';
function renderDocuments(){const term=document.querySelector('#document-search').value.toLowerCase().trim(); const matches=documents.filter(d=>(filter==='all'||d[2]===filter)&&`${d[0]} ${d[1]}`.toLowerCase().includes(term));const list=document.querySelector('#document-list');list.replaceChildren();for(const [title,subtitle,,file] of matches){const link=document.createElement('a');link.className='document';link.href=`documents/${file}`;link.setAttribute('download','');const icon=document.createElement('span');icon.className='file-icon';icon.textContent='PDF';const text=document.createElement('span');const name=document.createElement('strong');name.textContent=title;const description=document.createElement('small');description.textContent=subtitle;text.append(name,description);const action=document.createElement('span');action.className='download';action.textContent='Download ↓';link.append(icon,text,action);list.append(link);}document.querySelector('#document-count').textContent=matches.length?`${matches.length} document${matches.length===1?'':'s'}`:'No documents match. Try another search or choose All documents.';}
document.querySelector('#document-search')?.addEventListener('input',renderDocuments);
document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{filter=button.dataset.filter;document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));renderDocuments();}));
document.querySelector('[data-document="payment"]')?.addEventListener('click',()=>{filter='all';document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter==='all')));document.querySelector('#document-search').value='payment';renderDocuments();});
if(document.querySelector('#document-list'))renderDocuments();
