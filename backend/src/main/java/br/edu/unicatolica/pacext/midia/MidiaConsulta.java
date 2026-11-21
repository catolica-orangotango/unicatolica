package br.edu.unicatolica.pacext.midia;

import java.util.Collection;
import java.util.Map;

/** Leitura de arquivos por outros módulos, só por id (AD-3). */
public interface MidiaConsulta {

    /** Uma consulta só ao banco; ids desconhecidos ficam fora do mapa. */
    Map<Long, ArquivoAnexado> resolver(Collection<Long> ids);
}
