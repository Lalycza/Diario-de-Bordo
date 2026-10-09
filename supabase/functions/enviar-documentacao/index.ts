import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb, PDFTextField } from "npm:pdf-lib@1.17.1";

type DocType = "mapa" | "cronograma" | "diario";
const TEMPLATE_URL: Record<DocType, string> = {
  cronograma: "https://raw.githubusercontent.com/Lalycza/Diario-de-Bordo/main/docs/modelos/Cronograma%20.pdf",
  mapa: "https://raw.githubusercontent.com/Lalycza/Diario-de-Bordo/main/docs/modelos/Mapa.pdf",
  diario: "https://raw.githubusercontent.com/Lalycza/Diario-de-Bordo/main/docs/modelos/Diario.pdf",
};
const DOC_LABEL: Record<DocType, string> = { mapa:"Mapa de treinamentos", cronograma:"Cronograma", diario:"Diário de bordo" };
const STATUS_STYLE: Record<string, { fill: ReturnType<typeof rgb>; text: ReturnType<typeof rgb> }> = {
  Pendente:{fill:rgb(0.96,0.86,0.86),text:rgb(0.72,0.10,0.10)},
  "Em andamento":{fill:rgb(1,0.94,0.75),text:rgb(0.55,0.38,0)},
  Replanejada:{fill:rgb(0.85,0.92,1),text:rgb(0.05,0.35,0.70)},
  Replanejado:{fill:rgb(0.85,0.92,1),text:rgb(0.05,0.35,0.70)},
  Concluída:{fill:rgb(0.85,0.95,0.87),text:rgb(0.10,0.50,0.20)},
  Concluído:{fill:rgb(0.85,0.95,0.87),text:rgb(0.10,0.50,0.20)},
  Homologada:{fill:rgb(0.92,0.87,0.98),text:rgb(0.45,0.20,0.65)},
  Homologado:{fill:rgb(0.92,0.87,0.98),text:rgb(0.45,0.20,0.65)},
  Atrasada:{fill:rgb(0.96,0.82,0.82),text:rgb(0.72,0.08,0.08)}
};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json"}});
const clean=(v:unknown)=>String(v??"").replace(/\s+/g," ").trim();
const dateBR=(v:unknown)=>{if(!v)return "—";const p=String(v).slice(0,10).split("-");return p.length===3?p[2]+"/"+p[1]+"/"+p[0]:String(v)};
const statusLabel=(v:unknown)=>{const s=clean(v);const m:Record<string,string>={nao_iniciada:"Pendente",em_andamento:"Em andamento",concluida:"Concluída",homologada:"Homologada",replanejada:"Replanejada",atrasada:"Atrasada",em_risco:"Atrasada",pendente:"Pendente"};return m[s]??s??"Pendente"};
const wrap=(text:string,max=88)=>{const words=clean(text).split(" "),out:string[]=[];let line="";for(const w of words){if(!line)line=w;else if((line+" "+w).length<=max)line+=" "+w;else{out.push(line);line=w}}if(line)out.push(line);return out.length?out:[""]};
const b64=(bytes:Uint8Array)=>{let s="";for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(s)};

async function loadTemplate(type:DocType){const r=await fetch(TEMPLATE_URL[type]);if(!r.ok)throw new Error("Não foi possível carregar o modelo de "+DOC_LABEL[type]+" ("+r.status+").");return PDFDocument.load(new Uint8Array(await r.arrayBuffer()))}
function normalizeFieldName(v:string){return v.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"")}
function tryFillForm(doc:PDFDocument,values:Record<string,string>){try{const form=doc.getForm(),fields=form.getFields();let filled=0;for(const field of fields){if(!(field instanceof PDFTextField))continue;const name=normalizeFieldName(field.getName());const hit=Object.entries(values).find(([key])=>name.includes(normalizeFieldName(key)));if(!hit)continue;try{field.setText(hit[1]);filled++}catch{}}if(filled)form.updateFieldAppearances();return filled}catch{return 0}}

async function makePdf(type:DocType,project:any,rows:any[]){
  const template=await loadTemplate(type), output=await PDFDocument.create();
  const base=template.getPage(0), size=base.getSize(); const W=size.width,H=size.height;
  const font=await output.embedFont(StandardFonts.Helvetica), bold=await output.embedFont(StandardFonts.HelveticaBold);
  const blue=rgb(0.03,0.47,0.74), teal=rgb(0.16,0.59,0.56), grid=rgb(0.55,0.55,0.55), light=rgb(0.93,0.93,0.93), white=rgb(1,1,1), black=rgb(.08,.08,.08);
  const statusStyle=(v:string)=>{const s=statusLabel(v);if(s==='Pendente')return {fill:rgb(.97,.71,.73),text:rgb(.62,.16,.19)};if(s==='Em andamento')return {fill:rgb(1,.89,.60),text:rgb(.50,.36,.10)};if(s==='Concluída'||s==='Concluído')return {fill:rgb(.83,.92,.82),text:rgb(.24,.44,.25)};if(s==='Homologada'||s==='Homologado')return {fill:rgb(.85,.78,.93),text:rgb(.39,.25,.54)};return {fill:rgb(.95,.88,.67),text:rgb(.50,.36,.10)}};
  const txt=(p:any,t:string,x:number,y:number,size=8,b=false,color=black)=>p.drawText(clean(t),{x,y,size,font:b?bold:font,color,maxWidth:W-x-18});
  const fit=(t:string,max:number)=>{let v=clean(t);if(v.length<=max)return v;return v.slice(0,Math.max(0,max-1))+'…'};
  const cell=(p:any,x:number,y:number,w:number,h:number,t:string,opts:any={})=>{p.drawRectangle({x,y:y-h,width:w,height:h,color:opts.fill||white,borderColor:grid,borderWidth:.45});let lines=wrap(fit(t||'',opts.max||Math.max(8,Math.floor(w/(opts.size||7)*1.55))),opts.chars||Math.max(8,Math.floor(w/(opts.size||7)*1.55)));const sz=opts.size||7;const lh=sz+1.5;let yy=y-sz-2;for(const line of lines.slice(0,Math.max(1,Math.floor((h-3)/lh)))){let tw=opts.center?(w-font.widthOfTextAtSize(line,sz))/2+ x:x+3;txt(p,line,tw,yy,sz,!!opts.bold,opts.color||black);yy-=lh}};
  const statusCell=(p:any,x:number,y:number,w:number,h:number,v:string)=>{const st=statusStyle(v);cell(p,x,y,w,h,statusLabel(v),{fill:st.fill,color:st.text,bold:true,center:true,size:7,max:22})};
  const newPage=()=>{const p=output.addPage([W,H]);return p};
  const p0=()=>newPage();
  if(type==='mapa'){
    let p=p0(), y=H-28;
    const pName=clean(project.name||project.cliente), client=clean(project.cliente), analyst=clean(project.analista), start=dateBR(project.start_date), end=dateBR(project.delivery_date), orig=dateBR(project.original_delivery_date||project.delivery_date), prog=String(project.progress??0)+'%';
    const cols=[70,115,70,115,70,115];
    for(let r=0;r<3;r++){let x=18;const vals=r===0?['Projeto:',pName,'Data Início:',start,'Total Progresso:',prog]:r===1?['Analista Implantação:',analyst,'Data Entrega:',end,'Módulos Homologados:',String(rows.filter(r=>statusLabel(r.status)==='Homologada').length)]:['Atualizado em:',new Date().toLocaleString('pt-BR'),'Entrega Original:',orig,'Pendentes:',String(rows.filter(r=>statusLabel(r.status)==='Pendente').length)];for(let i=0;i<6;i+=2){cell(p,x,y,cols[i],22,vals[i],{bold:true,size:7,center:true,fill:light,max:20});x+=cols[i];cell(p,x,y,cols[i+1],22,vals[i+1],{size:7,max:22});x+=cols[i+1]}y-=22}
    const heads=['Utilitários','Módulos','Treinamento','Data Homologação','Responsável Homologação','Status'], widths=[100,190,65,85,95,60];let x=18;for(let i=0;i<heads.length;i++){cell(p,x,y,widths[i],25,heads[i],{fill:blue,color:white,bold:true,center:true,size:7,max:25});x+=widths[i]}y-=25;
    const modules:any[]=[];for(const r of rows){const name=clean(r.module_name||r.module?.name||r.name), sub=clean(r.submodule_name||r.submodule?.name||r.submodule);let m=modules.find(x=>x.name===name);if(!m){m={name,items:[]};modules.push(m)}if(sub)m.items.push(r)}
    for(const m of modules){const items=m.items.length?m.items:[{name:'',status:'Pendente'}];const blockH=Math.max(22,items.length*22);if(y-blockH<24){p=p0();y=H-35; x=18;for(let i=0;i<heads.length;i++){cell(p,x,y,widths[i],25,heads[i],{fill:blue,color:white,bold:true,center:true,size:7});x+=widths[i]}y-=25}
      cell(p,18,y,100,blockH,m.name,{fill:blue,color:white,bold:true,center:true,size:7,max:24});
      items.forEach((r:any,idx:number)=>{const yy=y-idx*22;cell(p,118,yy,190,22,idx===0?fit(r.name||r.submodule_name||'',48):fit(r.name||r.submodule_name||'',48),{size:7,bold:!r.submodule_name,max:48});cell(p,308,yy,65,22,dateBR(r.training_start_date||r.start||r.planned_date),{size:6.5,center:true});cell(p,373,yy,85,22,dateBR(r.homologation_date||r.homologation),{size:6.5,center:true});cell(p,458,yy,95,22,clean(r.homologation_responsible||r.homologationResponsible),{size:6.5,center:true});statusCell(p,553,yy,60,22,r.status||'Pendente')});y-=blockH}
  } else if(type==='cronograma'){
    let p=p0(),y=H-28;const client=clean(project.cliente),name=clean(project.name),analyst=clean(project.analista);const top=[['Projeto:',name,'Analista',analyst,'Progresso Geral:',String(project.progress??0)+'%','Módulo Homologado',String(rows.filter(r=>statusLabel(r.status)==='Homologada').length),'Responsável Cliente:',clean(project.responsavel_cliente||'')],['Cliente:',client,'Coordenação:',clean(project.coordenacao||''),'Data Base:',new Date().toLocaleString('pt-BR'),'','','','',''],['Data Início:',dateBR(project.start_date),'Data Entrega:',dateBR(project.delivery_date),'Data Entrega Original:',dateBR(project.original_delivery_date||project.delivery_date),'Dias para Go Live:',String(project.delivery_date?Math.max(0,Math.ceil((new Date(String(project.delivery_date).slice(0,10)+'T00:00:00').getTime()-Date.now())/86400000)):0),'','']];for(const rr of top){let x=18;for(let i=0;i<rr.length;i+=2){if(!rr[i])continue;const w=i===0?62: i===2?62:i===4?70:65;cell(p,x,y,w,21,rr[i],{fill:light,bold:true,center:true,size:6.5,max:18});x+=w;const vw= i===0?105:i===2?105:i===4?115:90;cell(p,x,y,vw,21,rr[i+1]||'',{size:6.5,max:22});x+=vw}y-=21}
    txt(p,'1. RESUMO DE ENTREGAS',W/2-65,y-2,10,true);y-=14;const hs=['FASE DO PROJETO','STATUS','CONCLUSÃO','DATA HOMOLOGAÇÃO','RESPONSÁVEL HOMOLOGAÇÃO','OBSERVAÇÕES'],ww=[105,65,85,85,105,125];let x=18;hs.forEach((h,i)=>{cell(p,x,y,ww[i],25,h,{fill:blue,color:white,bold:true,center:true,size:6.5,max:25});x+=ww[i]});y-=25;
    for(const r of rows){if(y<45){p=p0();y=H-30}x=18;const vals=[r.name||r.nome||'',statusLabel(r.status),dateBR(r.completion||r.data_conclusao),dateBR(r.homologation||r.data_homologacao),r.homologation_responsible||r.responsavel_homologacao||'',r.observations||r.observacoes||''];cell(p,x,y,ww[0],22,vals[0],{size:6.5,center:true,max:28});x+=ww[0];statusCell(p,x,y,ww[1],22,vals[1]);x+=ww[1];for(let i=2;i<6;i++){cell(p,x,y,ww[i],22,String(vals[i]||''),{size:6.5,center:true,max:i===5?35:20});x+=ww[i]}y-=22}
    txt(p,'3. PRÓXIMOS PASSOS / ATIVIDADES',18,y-2,9,true);y-=12;const months=[['Janeiro','Fevereiro','Março'],['Abril','Maio','Junho'],['Julho','Agosto','Setembro'],['Outubro','Novembro','Dezembro']];for(const ms of months){if(y<150){p=p0();y=H-30}cell(p,18,y,W-36,18,'Trimestre',{fill:white,bold:true,center:true,size:8});y-=18;const qrows=rows.filter(r=>ms.includes(r.month));if(qrows.length){for(const r of qrows.slice(0,10)){cell(p,18,y,105,18,r.name||r.nome||'',{size:6.5,max:25});cell(p,123,y,60,18,r.responsible||r.responsavel||'HPRO',{size:6.5,center:true});for(const m of ms){for(let w=1;w<=5;w++){const active=(r.month===m&&Number(r.week)===w);cell(p,183+(ms.indexOf(m)*5+w-1)*55,y,55,18,active?statusLabel(r.status):'',{fill:active?statusStyle(r.status).fill:white,color:active?statusStyle(r.status).text:black,bold:active,center:true,size:5.5,max:12})}}y-=18}}y-=8}
  } else {
    const first=await output.copyPages(template,[0]);let p=first[0];output.addPage(p);p.drawRectangle({x:10,y:0,width:W-20,height:H-70,color:white});const logoArea=H-42;txt(p,new Date().toLocaleString('pt-BR'),W/2-45,logoArea-22,8,true,teal);let y=logoArea-36;
    const ident=[['Cliente',project.cliente],['Projeto',project.name],['Analista Implantador',project.analista],['Responsável Cliente',project.responsavel_cliente||''],['Data Início',dateBR(project.start_date)],['Data Entrega',dateBR(project.delivery_date)],['Data Original Entrega',dateBR(project.original_delivery_date||project.delivery_date)]];for(const [a,b] of ident){cell(p,18,y,105,18,a,{bold:true,color:teal,center:true,size:7});cell(p,123,y,W-41,18,clean(b),{size:7});y-=18}
    txt(p,'Ponderações/Orientações:',18,y-2,8,true);y-=14;const orient=['◆Todo o andamento do processo de implantação será registrado neste documento;','◆O cliente receberá a versão atualizada sempre quando for registrado nova movimentação;','◆O cliente deverá ler atentamente as informações registradas neste documento;','◆O cliente poderá questionar ou solicitar esclarecimentos assim que receber a nova versão;'];for(const o of orient){txt(p,o,18,y,7);y-=11}y-=4;
    const addEntry=(r:any)=>{const date=dateBR(r.data_reuniao||r.date),time=clean(r.hora_reuniao||r.time),h=42+Math.min(130,wrap(clean(r.pauta||''),105).length*9)+Math.min(60,wrap(clean(r.tarefas_hpro||r.hpro||''),105).length*9)+Math.min(60,wrap(clean(r.tarefas_cliente||r.client||''),105).length*9);if(y-h<30){p=newPage();y=H-35}cell(p,18,y,W-36,18,date,{fill:teal,color:white,bold:true,center:true,size:8});y-=18;cell(p,18,y,W-36,17,time,{fill:teal,color:white,bold:true,center:true,size:7});y-=17;const rr=[['Participantes:',r.participantes||r.participants||''],['Pauta:',r.pauta||''],['Tarefas HPro:',r.tarefas_hpro||r.hpro||''],['Tarefas Cliente:',r.tarefas_cliente||r.client||''],['Próxima Visita:',r.proxima_visita||r.next||''],['Gerar cobrança:',r.gerar_cobranca||r.billing||'']];for(const [a,b] of rr){const lines=wrap(clean(b),105),hh=Math.max(17,lines.length*9);cell(p,18,y,105,hh,a,{fill:teal,color:white,bold:true,center:true,size:7});cell(p,123,y,W-41,hh,clean(b),{size:7,max:105});y-=hh}y-=8};for(const r of rows) addEntry(r);
  }
  return output.save();
}

Deno.serve(async(req)=>{
  if(req.method!=="POST")return json({ok:false,message:"Método não permitido."},405);
  try{
    const body=await req.json(),projectId=clean(body.projectId);
    const documentTypes=(Array.isArray(body.documentTypes)?body.documentTypes:[]).filter((x:string):x is DocType=>["mapa","cronograma","diario"].includes(x));
    const contactIds=Array.isArray(body.contactIds)?body.contactIds.map(clean).filter(Boolean):[];
    if(!projectId||!documentTypes.length||!contactIds.length)return json({ok:false,message:"Projeto, documentos e contatos são obrigatórios."},400);
    const authHeader=req.headers.get("Authorization")||"";
    const userClient=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:authHeader}}});
    const {data:{user},error:userError}=await userClient.auth.getUser();if(userError||!user)return json({ok:false,message:"Sessão inválida."},401);
    const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const {data:project,error:projectError}=await admin.from("projects").select("*").eq("id",projectId).single();if(projectError||!project)return json({ok:false,message:"Projeto não encontrado."},404);
    const {data:projectAssignments,error:assignmentError}=await admin.from("project_client_contacts").select("client_contact_id,is_responsible,receives_emails").eq("project_id",projectId).eq("receives_emails",true);if(assignmentError)throw assignmentError;
    const allowedIds=new Set((projectAssignments||[]).map((x:any)=>String(x.client_contact_id)));
    const responsibleIds=(projectAssignments||[]).filter((x:any)=>x.is_responsible).map((x:any)=>String(x.client_contact_id));
    const requestedIds=contactIds.filter((id:string)=>allowedIds.has(String(id)));
    const finalContactIds=[...new Set([...requestedIds,...responsibleIds])];
    if(!finalContactIds.length)return json({ok:false,message:"Configure os responsáveis e destinatários deste projeto antes de enviar e-mails."},400);
    const {data:contacts,error:contactsError}=await admin.from("client_contacts").select("id,name,email,client_id").in("id",finalContactIds).eq("client_id",project.client_id).not("email","is",null);if(contactsError||!contacts?.length)return json({ok:false,message:"Nenhum contato válido foi encontrado para este projeto."},400);
    const recipients=[...new Set(contacts.map((c:any)=>clean(c.email)).filter(Boolean))];
    const {data:trainings}=await admin.from("trainings").select("*,module:modules!trainings_module_id_fkey(name),submodule:submodules!trainings_submodule_id_fkey(name)").eq("project_id",projectId).order("planned_date",{ascending:true});
    const {data:stages}=await admin.from("project_stages").select("*").eq("project_id",projectId).order("data_prevista",{ascending:true});
    const {data:logs}=await admin.from("log_entries").select("*").eq("project_id",projectId).order("data_reuniao",{ascending:false});
    const attachments:any[]=[];
    for(const type of documentTypes){
      const sourceRows=type==="diario"?(logs||[]):type==="cronograma"?(stages||[]).map(s=>({...s,status:statusLabel(s.status),name:s.nome,planned_date:s.data_prevista,start:s.data_inicio,completion:s.data_conclusao})):(trainings||[]).map(t=>({...t,name:clean(t.submodule?.name||t.module?.name),status:statusLabel(t.status),start:t.training_start_date||t.realization_date,completion:t.training_completion_date,homologation:t.homologation_date}));
      const pdf=await makePdf(type,project,sourceRows);attachments.push({filename:type+"-"+(project.name||"projeto")+".pdf",content:b64(pdf)});
    }
    const subject=clean(body.subject)||"Atualização da implantação — "+(project.cliente||project.name||"Projeto");
    const emailBody=String(body.body??"").trim()||"Olá!\n\nSegue a documentação atualizada da implantação para acompanhamento.\n\nAtenciosamente,\nEquipe HPro";
    const apiKey=Deno.env.get("RESEND_API_KEY"),from=Deno.env.get("RESEND_FROM_EMAIL");if(!apiKey||!from)return json({ok:false,message:"Configuração de e-mail incompleta: RESEND_API_KEY/RESEND_FROM_EMAIL."},500);
    const now=new Date().toISOString();
    const {data:emailRow,error:emailInsertError}=await admin.from("project_emails").insert({project_id:projectId,client_id:project.client_id,sent_at:now,recipients:recipients.join(", "),subject,body:emailBody,attachment_names:attachments.map(a=>a.filename).join(", "),sent_by:user.id,status:"sending",document_types:documentTypes,attachment_metadata:attachments.map(a=>({filename:a.filename}))}).select("id").single();if(emailInsertError)throw emailInsertError;
    const resend=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+apiKey,"Content-Type":"application/json"},body:JSON.stringify({from,to:recipients,subject,text:emailBody,attachments})});
    const resendJson=await resend.json().catch(()=>({}));
    if(!resend.ok){await admin.from("project_emails").update({status:"error",error_message:JSON.stringify(resendJson),sent_at:new Date().toISOString()}).eq("id",emailRow.id);return json({ok:false,message:"O provedor de e-mail recusou o envio.",error:resendJson},502)}
    await admin.from("project_emails").update({status:"sent",provider_message_id:resendJson?.id??null}).eq("id",emailRow.id);
    for(const type of documentTypes)await admin.from("project_documentation_status").update({sent_at:now,sent_email_id:emailRow.id}).eq("project_id",projectId).eq("document_type",type);
    return json({ok:true,emailId:emailRow.id,attachments:attachments.map(a=>a.filename)});
  }catch(e){return json({ok:false,message:e instanceof Error?e.message:"Falha ao gerar/enviar a documentação."},500)}
});
