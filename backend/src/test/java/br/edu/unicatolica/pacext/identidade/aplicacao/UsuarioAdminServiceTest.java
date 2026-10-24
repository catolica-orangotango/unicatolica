package br.edu.unicatolica.pacext.identidade.aplicacao;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.edu.unicatolica.pacext.compartilhado.auditoria.AuditoriaService;
import br.edu.unicatolica.pacext.compartilhado.erro.ApiException;
import br.edu.unicatolica.pacext.compartilhado.paginacao.PageResponse;
import br.edu.unicatolica.pacext.compartilhado.seguranca.Perfis;
import br.edu.unicatolica.pacext.compartilhado.seguranca.UsuariosDeTeste;
import br.edu.unicatolica.pacext.identidade.dominio.Usuario;
import br.edu.unicatolica.pacext.identidade.dominio.UsuarioRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

/** {@link UsuarioAdminService} isolado: a regra de autorização roda de verdade (KAN-83). */
class UsuarioAdminServiceTest {

    private static final Long ADMIN_ID = 1L;
    private static final Long ALVO_ID = 2L;

    private final UsuarioRepository usuarioRepository = mock(UsuarioRepository.class);
    private final AuditoriaService auditoriaService = mock(AuditoriaService.class);
    private final UsuarioAdminService service = new UsuarioAdminService();

    UsuarioAdminServiceTest() {
        service.usuarioRepository = usuarioRepository;
        service.auditoriaService = auditoriaService;
        service.usuarioAutenticado = UsuariosDeTeste.comPerfis(ADMIN_ID, Perfis.ADMINISTRADOR);
    }

    private Usuario usuario(Long id, String perfil) {
        Usuario usuario = new Usuario();
        usuario.id = id;
        usuario.nome = "Usuário " + id;
        usuario.email = "usuario" + id + "@catolicasc.edu.br";
        usuario.perfil = perfil;
        return usuario;
    }

    private void comoPerfil(String perfil) {
        service.usuarioAutenticado = UsuariosDeTeste.comPerfis(ADMIN_ID, perfil);
    }

    // ---- listar ----

    @Test
    void listaMontaAPaginaComOsFiltros() {
        Usuario aluno = usuario(ALVO_ID, Perfis.ALUNO);
        when(usuarioRepository.listarParaAdmin("ana", Perfis.ALUNO, 1, 10)).thenReturn(List.of(aluno));
        when(usuarioRepository.contarParaAdmin("ana", Perfis.ALUNO)).thenReturn(11L);

        PageResponse<Usuario> pagina = service.listar("ana", Perfis.ALUNO, 1, 10);

        assertEquals(List.of(aluno), pagina.content());
        assertEquals(1, pagina.page());
        assertEquals(10, pagina.size());
        assertEquals(11L, pagina.totalElements());
        assertEquals(2, pagina.totalPages());
    }

    @Test
    void listaTrazPaginaETamanhoParaDentroDaFaixa() {
        service.listar(null, null, -3, 0);
        verify(usuarioRepository).listarParaAdmin(null, null, 0, 1);

        service.listar(null, null, 0, 5000);
        verify(usuarioRepository).listarParaAdmin(null, null, 0, 100);
    }

    @Test
    void listaTrataFiltrosEmBrancoComoSemFiltro() {
        service.listar("   ", " ", 0, 20);

        verify(usuarioRepository).listarParaAdmin(null, null, 0, 20);
    }

    @Test
    void listaRejeitaPerfilDesconhecido() {
        ApiException erro = assertThrows(ApiException.class, () -> service.listar(null, "DONO", 0, 20));

        assertEquals(422, erro.getStatus());
        assertEquals("PERFIL_INVALIDO", erro.getCode());
    }

    @Test
    void alunoEModeradorRecebem403EmTodasAsOperacoes() {
        for (String perfil : new String[] {Perfis.ALUNO, Perfis.MODERADOR}) {
            comoPerfil(perfil);
            for (Runnable operacao : List.<Runnable>of(
                    () -> service.listar(null, null, 0, 20),
                    () -> service.alterarPerfil(ALVO_ID, Perfis.MODERADOR),
                    () -> service.alterarSituacao(ALVO_ID, false))) {
                ApiException erro = assertThrows(ApiException.class, operacao::run);
                assertEquals(403, erro.getStatus());
                assertEquals("ACESSO_NEGADO", erro.getCode());
            }
        }
        verify(usuarioRepository, never()).findByIdOptional(anyLong());
    }

    // ---- alterar perfil ----

    @Test
    void alteraOPerfilInvalidaASessaoERegistraAuditoria() {
        Usuario alvo = usuario(ALVO_ID, Perfis.ALUNO);
        when(usuarioRepository.findByIdOptional(ALVO_ID)).thenReturn(Optional.of(alvo));

        Usuario alterado = service.alterarPerfil(ALVO_ID, Perfis.MODERADOR);

        assertEquals(Perfis.MODERADOR, alterado.perfil);
        assertNotNull(alterado.sessaoValidaDesde);
        verify(auditoriaService).registrar(eq(ADMIN_ID), eq("identidade"), eq("PERFIL_ALTERADO"), eq("Usuario"),
                eq(ALVO_ID), eq("ALUNO -> MODERADOR"));
    }

    @Test
    void mesmoPerfilNaoFazNadaNemDerrubaASessao() {
        Usuario alvo = usuario(ALVO_ID, Perfis.MODERADOR);
        when(usuarioRepository.findByIdOptional(ALVO_ID)).thenReturn(Optional.of(alvo));

        service.alterarPerfil(ALVO_ID, Perfis.MODERADOR);

        assertNull(alvo.sessaoValidaDesde);
        verify(auditoriaService, never()).registrar(any(), anyString(), anyString(), anyString(), any(), anyString());
    }

    @Test
    void rejeitaPerfilDesconhecido() {
        ApiException erro = assertThrows(ApiException.class, () -> service.alterarPerfil(ALVO_ID, "DONO"));

        assertEquals(422, erro.getStatus());
        assertEquals("PERFIL_INVALIDO", erro.getCode());
        verify(usuarioRepository, never()).findByIdOptional(anyLong());
    }

    @Test
    void rejeitaPerfilNulo() {
        ApiException erro = assertThrows(ApiException.class, () -> service.alterarPerfil(ALVO_ID, null));

        assertEquals("PERFIL_INVALIDO", erro.getCode());
    }

    @Test
    void usuarioInexistenteDa404() {
        when(usuarioRepository.findByIdOptional(99L)).thenReturn(Optional.empty());

        ApiException erro = assertThrows(ApiException.class, () -> service.alterarPerfil(99L, Perfis.MODERADOR));
        assertEquals(404, erro.getStatus());
        assertEquals("USUARIO_NAO_ENCONTRADO", erro.getCode());

        erro = assertThrows(ApiException.class, () -> service.alterarSituacao(99L, false));
        assertEquals(404, erro.getStatus());
    }

    @Test
    void administradorNaoAlteraOProprioPerfil() {
        Usuario eu = usuario(ADMIN_ID, Perfis.ADMINISTRADOR);
        when(usuarioRepository.findByIdOptional(ADMIN_ID)).thenReturn(Optional.of(eu));

        ApiException erro = assertThrows(ApiException.class, () -> service.alterarPerfil(ADMIN_ID, Perfis.ALUNO));

        assertEquals(409, erro.getStatus());
        assertEquals("AUTO_ALTERACAO_NAO_PERMITIDA", erro.getCode());
        assertEquals(Perfis.ADMINISTRADOR, eu.perfil);
    }

    @Test
    void naoRebaixaOUltimoAdministradorAtivo() {
        Usuario outro = usuario(ALVO_ID, Perfis.ADMINISTRADOR);
        when(usuarioRepository.findByIdOptional(ALVO_ID)).thenReturn(Optional.of(outro));
        when(usuarioRepository.contarAdministradoresAtivosExceto(ALVO_ID)).thenReturn(0L);

        ApiException erro = assertThrows(ApiException.class, () -> service.alterarPerfil(ALVO_ID, Perfis.ALUNO));

        assertEquals(409, erro.getStatus());
        assertEquals("ULTIMO_ADMINISTRADOR", erro.getCode());
        assertEquals(Perfis.ADMINISTRADOR, outro.perfil);
    }

    @Test
    void rebaixaAdministradorQuandoHaOutroAtivo() {
        Usuario outro = usuario(ALVO_ID, Perfis.ADMINISTRADOR);
        when(usuarioRepository.findByIdOptional(ALVO_ID)).thenReturn(Optional.of(outro));
        when(usuarioRepository.contarAdministradoresAtivosExceto(ALVO_ID)).thenReturn(1L);

        service.alterarPerfil(ALVO_ID, Perfis.MODERADOR);

        assertEquals(Perfis.MODERADOR, outro.perfil);
    }

    // ---- desativar e reativar ----

    @Test
    void desativaAContaDerrubaASessaoERegistraAuditoria() {
        Usuario alvo = usuario(ALVO_ID, Perfis.ALUNO);
        when(usuarioRepository.findByIdOptional(ALVO_ID)).thenReturn(Optional.of(alvo));

        Usuario alterado = service.alterarSituacao(ALVO_ID, false);

        assertFalse(alterado.ativo);
        assertNotNull(alterado.sessaoValidaDesde);
        verify(auditoriaService).registrar(eq(ADMIN_ID), eq("identidade"), eq("CONTA_DESATIVADA"), eq("Usuario"),
                eq(ALVO_ID), eq("ativo: true -> false"));
    }

    @Test
    void reativaAContaERegistraAuditoria() {
        Usuario alvo = usuario(ALVO_ID, Perfis.ALUNO);
        alvo.ativo = false;
        when(usuarioRepository.findByIdOptional(ALVO_ID)).thenReturn(Optional.of(alvo));

        Usuario alterado = service.alterarSituacao(ALVO_ID, true);

        assertTrue(alterado.ativo);
        verify(auditoriaService).registrar(eq(ADMIN_ID), eq("identidade"), eq("CONTA_REATIVADA"), eq("Usuario"),
                eq(ALVO_ID), eq("ativo: false -> true"));
    }

    @Test
    void mesmaSituacaoNaoFazNada() {
        Usuario alvo = usuario(ALVO_ID, Perfis.ALUNO);
        when(usuarioRepository.findByIdOptional(ALVO_ID)).thenReturn(Optional.of(alvo));

        service.alterarSituacao(ALVO_ID, true);

        assertNull(alvo.sessaoValidaDesde);
        verify(auditoriaService, never()).registrar(any(), anyString(), anyString(), anyString(), any(), anyString());
    }

    @Test
    void administradorNaoDesativaAPropriaConta() {
        Usuario eu = usuario(ADMIN_ID, Perfis.ADMINISTRADOR);
        when(usuarioRepository.findByIdOptional(ADMIN_ID)).thenReturn(Optional.of(eu));

        ApiException erro = assertThrows(ApiException.class, () -> service.alterarSituacao(ADMIN_ID, false));

        assertEquals(409, erro.getStatus());
        assertEquals("AUTO_ALTERACAO_NAO_PERMITIDA", erro.getCode());
        assertTrue(eu.ativo);
    }

    @Test
    void naoDesativaOUltimoAdministradorAtivo() {
        Usuario outro = usuario(ALVO_ID, Perfis.ADMINISTRADOR);
        when(usuarioRepository.findByIdOptional(ALVO_ID)).thenReturn(Optional.of(outro));
        when(usuarioRepository.contarAdministradoresAtivosExceto(ALVO_ID)).thenReturn(0L);

        ApiException erro = assertThrows(ApiException.class, () -> service.alterarSituacao(ALVO_ID, false));

        assertEquals(409, erro.getStatus());
        assertEquals("ULTIMO_ADMINISTRADOR", erro.getCode());
        assertTrue(outro.ativo);
    }

    @Test
    void desativaAdministradorQuandoHaOutroAtivo() {
        Usuario outro = usuario(ALVO_ID, Perfis.ADMINISTRADOR);
        when(usuarioRepository.findByIdOptional(ALVO_ID)).thenReturn(Optional.of(outro));
        when(usuarioRepository.contarAdministradoresAtivosExceto(ALVO_ID)).thenReturn(1L);

        service.alterarSituacao(ALVO_ID, false);

        assertFalse(outro.ativo);
    }
}
