import {
  ArrowLeft,
  BadgeInfo,
  Copyright,
  Database,
  ExternalLink,
  FileWarning,
  Globe2,
  HardDrive,
  Scale,
  ShieldAlert,
} from 'lucide-react'
import { Link } from 'react-router-dom'

const DATA_SOURCES = [
  {
    name: 'Wiki PokeXGames',
    href: 'https://wiki.pokexgames.com/',
    description: 'Informações de jogo, Pokémon, levels, clans, tiers, funções, movimentos, tasks, held items, ícones e imagens.',
  },
  {
    name: 'Project Pokémon',
    href: 'https://projectpokemon.org/home/docs/spriteindex_148/',
    description: 'Índice de sprites animados utilizados nas visualizações Normal, Shiny, frente e costas.',
  },
  {
    name: 'media-pxg',
    href: 'https://github.com/m1theus/media-pxg',
    description: 'Projeto comunitário consultado para médias de captura.',
  },
  {
    name: 'PXG Dex',
    href: 'https://www.pxgdex.pro/',
    description: 'Referência indicada nos metadados da base para classificações de dificuldade de captura.',
  },
]

const OFFICIAL_REFERENCES = [
  { name: 'Termos de uso da Pokémon', href: 'https://www.pokemon.com/us/legal/' },
  { name: 'Termos de uso da Nintendo', href: 'https://www.nintendo.com/us/terms-of-use/' },
  { name: 'Site oficial da PokeXGames', href: 'https://www.pokexgames.com/' },
]

function LegalSection({ id, icon, title, children }) {
  return (
    <section className="legal-section" id={id}>
      <div className="legal-section-heading">
        <span>{icon}</span>
        <h2>{title}</h2>
      </div>
      <div className="legal-section-copy">{children}</div>
    </section>
  )
}

function ExternalReference({ href, name, description }) {
  return (
    <a className="legal-source-card" href={href} target="_blank" rel="noreferrer">
      <span><Globe2 size={17} /></span>
      <div>
        <strong>{name}</strong>
        {description && <p>{description}</p>}
      </div>
      <ExternalLink size={15} />
    </a>
  )
}

export default function LegalPage() {
  return (
    <div className="legal-page">
      <Link className="back-link" to="/"><ArrowLeft size={17} />Voltar para a Pokédex</Link>

      <header className="legal-hero">
        <div className="eyebrow"><Scale size={15} />Transparência e atribuições</div>
        <h1>Avisos legais</h1>
        <p>O PXG Atlas é uma ferramenta independente criada por fãs para organizar informações públicas sobre o jogo. Esta página identifica os titulares, as fontes consultadas e os limites do serviço.</p>
        <span>Última atualização: 20 de julho de 2026</span>
      </header>

      <div className="legal-important-note">
        <ShieldAlert size={22} />
        <div>
          <strong>Este aviso não é uma licença nem uma garantia de imunidade jurídica.</strong>
          <p>Ele registra a intenção e as práticas do projeto. Permissões específicas, obrigações legais e riscos devem ser avaliados por um advogado qualificado na jurisdição aplicável.</p>
        </div>
      </div>

      <div className="legal-layout">
        <aside className="legal-summary">
          <strong>Nesta página</strong>
          <nav aria-label="Seções dos avisos legais">
            <a href="#independence">Independência</a>
            <a href="#rights">Marcas e direitos</a>
            <a href="#sources">Fontes e créditos</a>
            <a href="#accuracy">Precisão dos dados</a>
            <a href="#third-parties">Serviços externos</a>
            <a href="#privacy">Privacidade</a>
            <a href="#removal">Remoção de conteúdo</a>
          </nav>
        </aside>

        <main className="legal-content">
          <LegalSection id="independence" icon={<BadgeInfo size={20} />} title="Projeto independente e não oficial">
            <p>O PXG Atlas não é operado, aprovado, patrocinado, licenciado ou administrado pela Nintendo, Creatures Inc., GAME FREAK inc., The Pokémon Company, The Pokémon Company International, PokeXGames, Project Pokémon, PXG Dex ou pelos responsáveis pelo projeto media-pxg.</p>
            <p>Referências a essas organizações servem exclusivamente para identificar jogos, personagens, dados e fontes. Nada neste site deve ser interpretado como comunicação oficial, parceria ou endosso.</p>
          </LegalSection>

          <LegalSection id="rights" icon={<Copyright size={20} />} title="Marcas, personagens e propriedade intelectual">
            <p>Pokémon, nomes de personagens, artes, sprites, ícones, marcas e demais materiais relacionados pertencem aos seus respectivos titulares. PokeXGames, seus conteúdos e elementos próprios também pertencem aos respectivos responsáveis.</p>
            <p>O PXG Atlas não reivindica propriedade sobre esses materiais. A exibição de nomes, dados, imagens ou links não transfere direitos ao projeto, não concede licença a terceiros e não significa que o titular autorizou este site.</p>
            <p>O nome e a identidade visual do PXG Atlas foram criados para distinguir esta ferramenta comunitária e não devem ser confundidos com uma marca ou produto oficial.</p>
          </LegalSection>

          <LegalSection id="sources" icon={<Database size={20} />} title="Fontes e atribuições">
            <p>A aplicação consolida e normaliza informações consultadas nas fontes abaixo. Quando possível, as fichas mantêm links para a página original, permitindo conferir o contexto e eventuais atualizações.</p>
            <div className="legal-source-grid">
              {DATA_SOURCES.map((source) => <ExternalReference {...source} key={source.href} />)}
            </div>
            <p className="legal-muted">A atribuição identifica a procedência e não implica que a fonte seja responsável pelo PXG Atlas ou tenha aprovado o uso.</p>
          </LegalSection>

          <LegalSection id="accuracy" icon={<FileWarning size={20} />} title="Caráter informativo e ausência de garantia">
            <p>Os dados são oferecidos para consulta e planejamento dentro do jogo. Eles podem conter erros de coleta ou interpretação, ficar desatualizados após mudanças no jogo ou divergir de informações oficiais.</p>
            <p>Na extensão permitida pela legislação aplicável, o conteúdo é fornecido no estado em que se encontra, sem garantia de exatidão, disponibilidade contínua, adequação a uma estratégia ou resultado dentro do jogo. Antes de tomar decisões, confirme as informações nos canais oficiais e nas fontes vinculadas.</p>
          </LegalSection>

          <LegalSection id="third-parties" icon={<Globe2 size={20} />} title="Links, imagens e serviços de terceiros">
            <p>Algumas imagens são carregadas diretamente de servidores mantidos pela Wiki PokeXGames ou pelo Project Pokémon. Ao carregar esses arquivos ou abrir um link externo, seu navegador se comunica com o respectivo serviço, que possui termos e práticas de privacidade próprios.</p>
            <p>O PXG Atlas não controla a disponibilidade, segurança, conteúdo ou alterações desses serviços. Um link não representa recomendação, parceria ou responsabilidade pelo conteúdo encontrado fora deste site.</p>
            <div className="legal-reference-row">
              {OFFICIAL_REFERENCES.map((reference) => <ExternalReference {...reference} key={reference.href} />)}
            </div>
          </LegalSection>

          <LegalSection id="privacy" icon={<HardDrive size={20} />} title="Privacidade e armazenamento no navegador">
            <p>A versão atual não possui cadastro, área de login, formulário de contato ou API própria para receber dados pessoais. Preferências de visualização, filtros temporários, o time montado e o progresso do Pokélog podem ser armazenados localmente no navegador por meio de <code>localStorage</code> e <code>sessionStorage</code>.</p>
            <p>A hospedagem, as fontes tipográficas e os provedores das imagens remotas podem receber informações técnicas normais de uma requisição web, como endereço IP, navegador e horário de acesso, de acordo com as políticas desses terceiros.</p>
          </LegalSection>

          <LegalSection id="removal" icon={<ShieldAlert size={20} />} title="Correções e solicitações de remoção">
            <p>Se você representa um titular de direitos e acredita que algum material, link, atribuição ou uso deve ser corrigido ou removido, abra uma solicitação no repositório informando a URL afetada, o material questionado, sua relação com o titular e a medida solicitada.</p>
            <p>Não publique documentos pessoais ou informações sigilosas na solicitação pública. Após o primeiro contato, poderá ser combinado um canal adequado para fornecer comprovações adicionais.</p>
            <a className="legal-contact-button" href="https://github.com/kevinmarangoni/pxg-atlas/issues/new?labels=legal&title=Solicita%C3%A7%C3%A3o%20legal%20ou%20de%20remo%C3%A7%C3%A3o" target="_blank" rel="noreferrer">
              Abrir solicitação no GitHub <ExternalLink size={15} />
            </a>
          </LegalSection>
        </main>
      </div>
    </div>
  )
}
