package br.edu.unicatolica.pacext.comunidades.aplicacao;

import br.edu.unicatolica.pacext.comunidades.ComunidadeConsulta;
import br.edu.unicatolica.pacext.comunidades.dominio.ComunidadeMembroRepository;
import br.edu.unicatolica.pacext.comunidades.dominio.ComunidadeRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

/** Implementação package-private — só é alcançável via {@link ComunidadeConsulta} (AD-3). */
@ApplicationScoped
class ComunidadeConsultaImpl implements ComunidadeConsulta {

    @Inject
    ComunidadeRepository comunidadeRepository;

    @Inject
    ComunidadeMembroRepository comunidadeMembroRepository;

    @Override
    public boolean existe(Long comunidadeId) {
        return comunidadeRepository.existeAtiva(comunidadeId);
    }

    @Override
    public boolean ehMembro(Long comunidadeId, Long usuarioId) {
        return comunidadeMembroRepository.existeAssociacao(comunidadeId, usuarioId);
    }
}
