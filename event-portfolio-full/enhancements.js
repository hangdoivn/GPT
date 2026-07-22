(() => {
  const extraAssets = {
    'easter-day': [
      '1_uGEaIqUY0tfElge0lkBa5jl111F6g4f',
      '1Qxf7uGGqNziikwhAKBRdbm0MA5OS1J79',
      '1gjK2zbcLZ1NfX6rphNvSeaetDWy4D5A3',
      '1nuNEWRVaMJikrGXbFWTPDSmsAh57L-TN'
    ],
    'vin-lang-van': [
      '1tcmi_y-c0sCvf37-IsXg1IG25u0qylnG',
      '1MPoy-InDIMbB9uAo3gCWA9vjBCEHXegr'
    ],
    'to-nghe-san-khau': [
      '1WoQ556MPnr3wzBRlYBIx4mipbNu3SZa4',
      '1E6Y7DQCOpwWa-vTDwEJGzHb2ZjPuzySw'
    ],
    'an-toan-giao-thong': [
      '1Ttm3_cAb33vzHsEDBQAMj5QB4TyKGGuE',
      '1rWoHTfF59clyMDXfNYkj8QQxWtwo72gw'
    ],
    'hoa-hau-du-lich': [
      '1SjasETHv4IrJ7uLrwlqOwKhJg3Z254s9',
      '1N4NkyR6rDVrE-zolqi1kIvvyGgkd-YlX'
    ]
  };

  Object.entries(extraAssets).forEach(([slug, ids]) => {
    const project = projects.find(item => item.slug === slug);
    if (!project) return;
    ids.forEach(id => {
      if (!project.images.includes(id)) project.images.push(id);
    });
  });

  const featuredDetails = {
    'vin-lang-van': {
      copy: 'Coverage một sự kiện ra mắt quy mô lớn, ưu tiên không gian, đám đông, nghi thức và năng lượng thương hiệu.',
      picks: [2, 1, 3]
    },
    'yep-mib': {
      copy: 'Một đêm gala doanh nghiệp được kể lại bằng sân khấu, khoảnh khắc trao giải, tinh thần đội ngũ và cao trào chương trình.',
      picks: [0, 3, 6]
    },
    'xine-jazz': {
      copy: 'Không khí live music trong không gian F&B, tập trung vào ánh sáng, nghệ sĩ, khách hàng và trải nghiệm tại điểm đến.',
      picks: [0, 5, 8]
    },
    'jci-danang': {
      copy: 'Hai lớp nội dung trong cùng một dự án: nghi thức launching và những hoạt động kết nối cộng đồng.',
      picks: [0, 6, 2]
    }
  };

  function renderEnhancedFeatured() {
    const root = document.querySelector('#featuredGrid');
    if (!root || typeof projects === 'undefined') return;

    root.innerHTML = '';
    Object.entries(featuredDetails).forEach(([slug, detail], index) => {
      const project = projects.find(item => item.slug === slug);
      if (!project) return;

      const article = document.createElement('article');
      article.className = 'featured-case';

      const copy = document.createElement('div');
      copy.className = 'featured-copy';
      copy.innerHTML = `
        <span class="featured-no">${String(index + 1).padStart(2, '0')}</span>
        <small>${project.category} · ${project.type}</small>
        <h3>${project.title}</h3>
        <p>${detail.copy}</p>
      `;

      const action = document.createElement('button');
      action.className = 'case-link';
      action.type = 'button';
      action.textContent = `Xem trọn dự án · ${project.images.length} ảnh ↗`;
      action.addEventListener('click', () => openProject(project));
      copy.appendChild(action);

      const collage = document.createElement('div');
      collage.className = 'featured-media featured-collage';
      collage.setAttribute('aria-label', `Xem dự án ${project.title}`);

      detail.picks.forEach((assetIndex, shotIndex) => {
        const imageId = project.images[assetIndex] || project.images[shotIndex] || project.images[0];
        const shot = document.createElement('button');
        shot.type = 'button';
        shot.className = `featured-shot ${shotIndex === 0 ? 'featured-main' : 'featured-side'}`;
        shot.setAttribute('aria-label', `Mở gallery ${project.title}`);

        const image = makeImage(
          imageId,
          shotIndex === 0 ? 1500 : 900,
          `${project.title} — preview ${shotIndex + 1}`,
          index === 0 && shotIndex === 0 ? 'eager' : 'lazy'
        );
        shot.appendChild(image);

        if (shotIndex === 0) {
          const caption = document.createElement('span');
          caption.className = 'featured-caption';
          caption.innerHTML = `<b>${project.title}</b><em>${project.type}</em>`;
          shot.appendChild(caption);
        }

        shot.addEventListener('click', () => openProject(project));
        collage.appendChild(shot);
      });

      article.append(copy, collage);
      root.appendChild(article);
    });
  }

  const originalOpenProject = openProject;
  openProject = function enhancedOpenProject(project) {
    originalOpenProject(project);

    const index = projects.findIndex(item => item.slug === project.slug);
    const next = projects[(index + 1) % projects.length];
    const endLabel = document.querySelector('.modal-end span');
    const nextButton = document.querySelector('.close-project-bottom');

    if (endLabel) endLabel.textContent = 'Dự án tiếp theo';
    if (nextButton) {
      nextButton.textContent = `${next.title} →`;
      nextButton.onclick = () => {
        const modal = document.querySelector('#projectModal');
        if (modal) modal.scrollTo({ top: 0, behavior: 'auto' });
        enhancedOpenProject(next);
      };
    }

    const modalCopy = document.querySelector('.modal-copy');
    const modalMeta = document.querySelector('#modalMeta');
    if (modalCopy && modalMeta) {
      let summary = modalCopy.querySelector('.asset-summary');
      if (!summary) {
        summary = document.createElement('div');
        summary.className = 'asset-summary';
        modalMeta.insertAdjacentElement('afterend', summary);
      }
      summary.innerHTML = `<strong>${project.images.length}</strong><span>ảnh chọn lọc<br>click để xem toàn màn hình</span>`;
    }
  };

  const hero = document.querySelector('.hero-visual img');
  if (hero) {
    hero.src = DRIVE('1Sj2a0ccPQLjz849fD0slbHsZA-d_VYx2', 2200);
    hero.alt = 'Không khí sự kiện Vin Làng Vân do Hang Đôi Production thực hiện';
    attachFallback(hero, '1Sj2a0ccPQLjz849fD0slbHsZA-d_VYx2', 2200);
  }

  const featuredIntro = document.querySelector('#featured .section-title-row p');
  if (featuredIntro) {
    featuredIntro.textContent = 'Bốn case study đại diện cho quy mô lớn, gala doanh nghiệp, hospitality và hoạt động cộng đồng.';
  }

  const assetTotal = projects.reduce((total, project) => total + project.images.length, 0);
  const assetMeta = document.querySelector('.hero-meta span:nth-child(2)');
  if (assetMeta) assetMeta.textContent = `${assetTotal}+ hình ảnh`;

  renderEnhancedFeatured();
})();
