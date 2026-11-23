/**
 * Texto da Política de Privacidade e dos Termos de Uso (KAN-130, RNF05 / LGPD).
 *
 * TEXTO PROVISÓRIO: a redação final precisa ser revisada e aprovada pela faculdade antes de ir
 * para os usuários (decisão em aberto no KAN-130). Ao trocar o conteúdo, subir `VERSAO_TEXTOS_LEGAIS`:
 * o aceite no cadastro (KAN-131) grava essa versão.
 */
export const VERSAO_TEXTOS_LEGAIS = '0.1-provisoria';

export type TipoDocumentoLegal = 'privacidade' | 'termos';

export interface SecaoLegal {
  titulo: string;
  paragrafos: readonly string[];
}

export interface DocumentoLegal {
  titulo: string;
  resumo: string;
  secoes: readonly SecaoLegal[];
}

const CONTROLADOR =
  'A UniCatólica é um projeto de extensão (PAC Extensionista) do Campus Joinville da CatólicaSC.';

export const DOCUMENTOS_LEGAIS: Readonly<Record<TipoDocumentoLegal, DocumentoLegal>> = {
  privacidade: {
    titulo: 'Política de Privacidade',
    resumo: 'Como a UniCatólica trata os seus dados pessoais, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018).',
    secoes: [
      {
        titulo: 'Quem somos',
        paragrafos: [CONTROLADOR, 'Dúvidas sobre os seus dados podem ser enviadas à coordenação do projeto pelo e-mail institucional da CatólicaSC.'],
      },
      {
        titulo: 'Para que usamos os dados',
        paragrafos: [
          'Usamos os dados só para o funcionamento da rede acadêmica: criar e manter a sua conta, ligar você à comunidade do seu curso, mostrar o seu perfil aos colegas, publicar o que você escreve e moderar o conteúdo.',
        ],
      },
      {
        titulo: 'Quais dados coletamos',
        paragrafos: [
          'Nome, e-mail institucional, senha (guardada de forma irreversível), curso, período e interesses do perfil, foto de perfil, postagens, comentários, arquivos anexados e as comunidades de que você participa.',
          'Também registramos ações importantes da plataforma (por exemplo, alterações de perfil) para fins de segurança e auditoria.',
        ],
      },
      {
        titulo: 'Anonimato em enquetes e denúncias',
        paragrafos: [
          'O voto numa enquete é anônimo: guardamos que você votou, mas não em qual opção, e o criador da enquete nunca vê votos individuais.',
          'A identidade de quem faz uma denúncia não é mostrada ao moderador que a analisa.',
        ],
      },
      {
        titulo: 'Com quem compartilhamos',
        paragrafos: [
          'Não vendemos nem cedemos os seus dados. Usamos provedores de infraestrutura (hospedagem, banco de dados, envio de e-mail e armazenamento de arquivos) apenas para operar a plataforma.',
        ],
      },
      {
        titulo: 'Por quanto tempo guardamos',
        paragrafos: [
          'Guardamos os dados enquanto a sua conta existir. Ao pedir a exclusão da conta, os dados pessoais são removidos ou anonimizados, salvo os que a lei exigir manter.',
        ],
      },
      {
        titulo: 'Seus direitos',
        paragrafos: [
          'Você pode pedir confirmação de que tratamos os seus dados, acesso a eles, correção, anonimização, eliminação e informação sobre com quem os compartilhamos. Para exercer qualquer direito, fale com a coordenação do projeto.',
        ],
      },
    ],
  },
  termos: {
    titulo: 'Termos de Uso',
    resumo: 'Regras para usar a UniCatólica, a rede acadêmica do Campus Joinville da CatólicaSC.',
    secoes: [
      {
        titulo: 'Quem pode usar',
        paragrafos: [
          'A plataforma é para estudantes com e-mail institucional da CatólicaSC e maiores de 18 anos. Você é responsável pela sua conta e pela sua senha.',
        ],
      },
      {
        titulo: 'Como usar',
        paragrafos: [
          'Use a plataforma com respeito. Não publique conteúdo ofensivo, discriminatório, ilegal, que viole direitos autorais ou que exponha dados de outras pessoas sem autorização.',
          'Não tente acessar contas de terceiros nem prejudicar o funcionamento do sistema.',
        ],
      },
      {
        titulo: 'Conteúdo que você publica',
        paragrafos: [
          'O que você publica é de sua responsabilidade. Ao publicar, você autoriza a plataforma a exibi-lo na comunidade escolhida. Você pode apagar o que publicou.',
        ],
      },
      {
        titulo: 'Moderação',
        paragrafos: [
          'Moderadores podem ocultar ou remover conteúdo que descumpra estes termos e, em casos graves, restringir o uso da conta. Qualquer pessoa pode denunciar um conteúdo; a identidade de quem denuncia é protegida.',
        ],
      },
      {
        titulo: 'Disponibilidade e mudanças',
        paragrafos: [
          'A plataforma é um projeto de extensão e pode ficar indisponível ou mudar sem aviso. Estes termos podem ser atualizados; a versão em vigor é a publicada nesta página.',
        ],
      },
    ],
  },
};
