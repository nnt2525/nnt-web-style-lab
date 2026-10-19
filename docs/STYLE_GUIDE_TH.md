# คู่มือ 49 สไตล์ / NNT Web Style Lab

โปรเจกต์นี้ตีความแนวออกแบบเว็บ **49 visual presets บน 9 โครงแอปและ workflow** สำหรับฝึกทั้งการออกแบบหน้าจอและการเชื่อม API สไตล์ที่ใช้ workflow เดียวกันจะแชร์โครงหน้าและฟังก์ชัน แล้วเปลี่ยนแบรนด์ สี ตัวอักษร พื้นผิว กรอบ และองค์ประกอบตกแต่ง จึงเหมาะกับการเปรียบเทียบวิธีนำเสนอ ไม่ใช่การนับว่าได้สร้างระบบธุรกิจครบวงจรอิสระ 49 ระบบ

ชื่อแนวบางชื่อใกล้เคียงหรือซ้อนทับกัน เช่น Glassmorphism กับ Glass Dashboard หรือ Retro Scrapbook กับ Mixed Media ตารางนี้ใช้ชื่อจาก manifest ของโปรเจกต์เพื่ออ้างอิง implementation ไม่ได้กำหนดนิยามสากลให้วงการออกแบบ

## เลือกดูตาม workflow

| รหัส | แอป | สิ่งที่ลองทำได้เมื่อรัน backend |
| --- | --- | --- |
| `commerce` | ร้านค้า | ดูสินค้า กรองหมวด ตะกร้า บันทึกและอ่านประวัติคำสั่งซื้อจำลอง |
| `booking` | จองบริการ | เลือกวัน เวลา จำนวนคน บันทึกและยกเลิกการจองจำลอง |
| `events` | อีเวนต์ | กรองงานและสำรองบัตรจำลอง พร้อมตรวจจำนวนคงเหลือใน workspace |
| `tasks` | กระดานงาน | เพิ่ม ค้นหา เปลี่ยนสถานะ ลบและกู้คืนงาน |
| `journal` | บทความ | อ่านเนื้อหาเต็ม กรองหมวด บันทึกและลบ bookmark |
| `learning` | บทเรียน | อ่านบทเรียน บันทึกความคืบหน้า ส่ง quiz ให้ server ตรวจ |
| `studio` | สตูดิโอสร้างภาพ | ปรับฉาก/seed/สี/ความหนาแน่น/การเคลื่อนไหว บันทึก preset และเก็บ brief จำลอง |
| `analytics` | ข้อมูลและบัญชีจำลอง | เพิ่มรายรับรายจ่าย ดูกราฟ กรองตาราง ส่งออก CSV ลบและกู้คืนรายการ |
| `ai` | คัดแยกข้อความ | เรียกโมเดล Naive Bayes ผ่าน API ดูคะแนน ความไม่มั่นใจ และประวัติ |

ร้านค้า การจอง บัตร และ brief ทั้งหมดเป็นข้อมูลจำลอง ไม่มีการชำระเงิน ส่งอีเมล ติดต่อสถานที่ หรือออกบัตรจริง Anonymous workspace ของ browser มีอายุเจ็ดวันและไม่ใช่บัญชีสมาชิก ดูรายละเอียดใน [README](../README.md) และ [API](API.md)

## รายชื่อจาก manifest

ลำดับ ชื่อ กลุ่ม แอป และแบรนด์ตรงกับ [`public/assets/styles.js`](../public/assets/styles.js) เปิดแต่ละตัวอย่างได้จาก gallery หรือ `/demos/<slug>/` เมื่อรันในเครื่อง

| # | Style preset | กลุ่ม | Workflow | แบรนด์ | Slug |
| --- | --- | --- | --- | --- | --- |
| 1 | Minimalist | Quiet | commerce | NORA | `minimalist` |
| 2 | Neomorphism / Soft UI | Quiet | tasks | softly | `soft-ui` |
| 3 | Organic & Hand-Drawn | Organic | booking | Brew & Bite | `organic-handdrawn` |
| 4 | Neubrutalism | Expressive | events | OFFGRID | `neubrutalism` |
| 5 | Cyberpunk & Synthwave | Future | events | NEXUS | `cyberpunk` |
| 6 | 3D & Interactive | Experimental | studio | ORBIT | `three-d-interactive` |
| 7 | Bento Grid | Structured | tasks | STACK | `bento-grid` |
| 8 | Tactile Brutalism | Structured | analytics | FACTOR | `tactile-brutalism` |
| 9 | Type Minimalism | Editorial | journal | FORM | `type-minimalism` |
| 10 | Retro Scrapbook / Y2K | Retro | journal | MOODBOARD | `retro-scrapbook` |
| 11 | Split-Screen Layout | Structured | booking | ROAMII | `split-screen` |
| 12 | Glassmorphism / Frosted Glass | Future | tasks | flowly | `glassmorphism` |
| 13 | Dark Futuristic / Sci-Fi Neon | Future | ai | SYNAPSE | `dark-futuristic` |
| 14 | Editorial & Magazine | Editorial | journal | FOLIO | `editorial` |
| 15 | Geometric & Abstract | Expressive | studio | ANGLE | `geometric-abstract` |
| 16 | Claymorphism | Organic | learning | BLOOM | `claymorphic` |
| 17 | Kinetic Typography | Experimental | events | LOUD | `kinetic-typography` |
| 18 | Maximalism / Bold & Chaos | Expressive | events | MORE! | `maximalism` |
| 19 | Chromatic Aberration & Glitch | Experimental | studio | SIGNAL | `glitch` |
| 20 | Skeuomorphism 2.0 | Retro | studio | ANALOG | `skeuomorphism` |
| 21 | Acid Graphic / Techno | Expressive | events | ACID | `acid-graphic` |
| 22 | Generative Art & Code | Experimental | studio | FIELD | `generative-art` |
| 23 | Industrial & Grid-Heavy | Structured | analytics | FORGE | `industrial-grid` |
| 24 | Neo-Retro / 8-Bit Pixel | Retro | learning | BYTEQUEST | `pixel-art` |
| 25 | Organic Fluid & Liquid | Organic | studio | MELT | `organic-fluid` |
| 26 | Brutalist Americana / Folk Retro | Retro | booking | SUNDAY | `folk-retro` |
| 27 | Typographic Neo-Noir | Editorial | journal | NOIR | `neo-noir` |
| 28 | Paper Cut-Out Art | Organic | learning | PAPERPLAY | `paper-cutout` |
| 29 | Cyber-Minimalism | Future | ai | NEURO | `cyber-minimalism` |
| 30 | Spatial UI | Future | studio | AETHER | `spatial-ui` |
| 31 | AI-Native & Agentic UX | Future | ai | QUEUE | `ai-native` |
| 32 | Japandi | Quiet | commerce | SORA | `japandi` |
| 33 | Anti-Polish & Raw Authenticity | Editorial | journal | RAW | `raw-authenticity` |
| 34 | Cinematic Scrollytelling | Experimental | studio | HORIZON | `cinematic` |
| 35 | Skeuomorphic Glass / Hyper-Glossy | Future | commerce | PRISM | `hyper-glossy` |
| 36 | Micro-Brutalism | Structured | tasks | PLAIN | `micro-brutalism` |
| 37 | Holographic & Iridescent | Future | events | IRIS | `holographic` |
| 38 | High-Density / Data-Rich | Structured | analytics | CONTROL | `data-dense` |
| 39 | Maximalist Typography | Expressive | journal | TYPEPLAY | `maximalist-type` |
| 40 | Organic Minimalist / Eco-Luxury | Organic | commerce | VERDE | `eco-luxury` |
| 41 | Pixelated Nostalgia / Lo-Fi Digital | Retro | tasks | DESKTOP | `lofi-digital` |
| 42 | Kinetic Grid / Animated Wireframe | Experimental | studio | GRID / PLAY | `kinetic-grid` |
| 43 | Gothic Cyberpunk / Dark Techno | Future | events | OBSIDIAN | `gothic-cyberpunk` |
| 44 | Collage & Scrapbook / Mixed Media | Organic | journal | CUT / PASTE | `mixed-media` |
| 45 | Typographic Brutalism | Expressive | journal | TYPECLUB | `typographic-brutalism` |
| 46 | Liquid Retro Gradient | Retro | studio | GLOW | `liquid-retro` |
| 47 | Technical Blueprint / Architectural | Structured | analytics | SCHEMA | `technical-blueprint` |
| 48 | Glassmorphic Dashboard / Tech-Luxe | Future | analytics | LUCENT | `glass-dashboard` |
| 49 | Y2K Cyber Pop | Retro | commerce | POP / SHOP | `y2k-cyberpop` |

## อ่านดีไซน์อย่างไรให้ได้ทักษะ

เลือกสองสไตล์ที่ใช้ workflow เดียวกัน เช่น Minimalist กับ Y2K Cyber Pop เพื่อเทียบลำดับสายตา ความหนาแน่น สี และการตกแต่ง โดยยังมีงานหลักแบบเดียวกัน จากนั้นเปรียบเทียบต่าง workflow เช่น Journal กับ Analytics เพื่อดูว่าลำดับข้อมูลเปลี่ยนไปตามหน้าที่ของแอปอย่างไร

| กลุ่ม | จุดที่ควรสังเกต |
| --- | --- |
| Quiet | พื้นที่ว่าง จังหวะข้อความ สีเรียบ และความชัดของ action |
| Organic | เส้นโค้ง สีวัสดุ รูปร่างที่ดูไม่แข็ง และภาพที่วาดด้วยโค้ด |
| Structured | กริด เส้นแบ่ง การจัดแนว และความหนาแน่นที่ช่วยอ่านข้อมูล |
| Editorial | hierarchy ของตัวอักษร คอลัมน์ และประสบการณ์อ่านเนื้อหายาว |
| Expressive | สเกลใหญ่ สีจัด กรอบหนัก และการคุมจุดเด่นไม่ให้กลบปุ่มสำคัญ |
| Future | พื้นโปร่ง แสง สีเข้ม/เย็น และความชัดของข้อความเหนือเอฟเฟกต์ |
| Retro | วัสดุจำลอง พิกเซล สีและองค์ประกอบที่สื่อบรรยากาศย้อนหลัง |
| Experimental | ฉากจาก seed การเคลื่อนไหว มุมมอง CSS 3D และการโต้ตอบกับภาพ |

กลุ่มข้างต้นเป็นหมวดใช้งานใน gallery ไม่ใช่การจัดอันดับคุณภาพ ทุกสไตล์ควรยังอ่านออก ใช้คีย์บอร์ดได้ เห็น focus และเข้าใจ feedback ของ API สีสวยหรือเอฟเฟกต์มากไม่ทดแทนสถานะกำลังบันทึก ข้อผิดพลาด และผลสำเร็จที่อ้างอิงข้อมูลจาก server

## จุดแก้ไขในโค้ด

1. เปลี่ยนชื่อ แบรนด์ ข้อความ กลุ่ม workflow หรือสีตั้งต้นใน `public/assets/styles.js` แล้วรัน `npm run build` เพื่อสร้าง route, palette และ fixture ใหม่
2. ปรับองค์ประกอบร่วมใน `public/assets/base.css` และลักษณะเฉพาะสไตล์ใน `public/assets/themes.css` โดยใช้ `body[data-style="slug"]` เพื่อจำกัดผลกระทบ
3. ปรับโครงหน้าและ interaction ใน `public/assets/apps/<workflow>.js` พร้อม `.css` อย่าแก้ไฟล์ HTML ที่สร้างอัตโนมัติเป็นหลัก เพราะ build ครั้งถัดไปจะเขียนทับ
4. ถ้าเพิ่มข้อมูลที่บันทึกได้ ให้แก้ API validation และ integration tests ด้วย อ้างอิง [Architecture](ARCHITECTURE.md) และ [API](API.md)
5. ทดสอบจอแคบ คีย์บอร์ด โหมด reduced motion และกรณี API ล้มเหลวร่วมกับหน้าจอปกติ

GitHub Pages แสดงเนื้อหาสาธิตแบบอ่านอย่างเดียว งานเขียนข้อมูลและโมเดล AI ต้องรัน Node backend ส่วนสไตล์ 3D ใช้ Canvas/CSS และ preset AI-Native ใช้ classifier ขนาดเล็ก ไม่มี LLM หรือ agent อัตโนมัติอยู่เบื้องหลังชื่อเหล่านี้

ใช้โปรเจกต์ที่ AI ช่วยสร้างนี้เป็นฐานทดลองของตัวเอง: เปลี่ยนหนึ่งอย่าง อธิบายเหตุผล ตรวจผล และเล่าเส้นทางข้อมูลได้ก่อนนำเสนอเป็นผลงานสมัครฝึกงาน
