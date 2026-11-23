/**
 * Módulo de Mídia (RF48–RF51, KAN-128): anexo de postagem e foto de perfil.
 *
 * <p>Dono da tabela {@code arquivo} (AD-3): só metadados (chave no bucket, tipo detectado,
 * tamanho, nome original, dono, finalidade, {@code em_uso}); os bytes ficam num armazenamento
 * de objetos S3-compatível privado ({@code dominio.ArmazenamentoObjetos}, implementado por
 * {@code aplicacao.ArmazenamentoS3}), lidos só por URL assinada de curta duração. O dono é
 * guardado só pelo id ({@code dono_id}), sem FK nem relação JPA. Organizado como
 * {@code identidade}: {@code web}, {@code aplicacao}, {@code dominio}; não importa nenhum
 * outro módulo, só {@code compartilhado}.</p>
 *
 * <p>Implementa {@code POST /arquivos} (multipart, autenticado): RF48 (anexar PDF, PNG ou
 * JPEG) e RF50 (tipo validado pelos primeiros bytes, nunca pela extensão nem pelo
 * {@code Content-Type}; PDF até 5 MB, imagem até 2 MB, foto de perfil só imagem; limites em
 * {@code midia.limite.*}). A associação com a postagem (RF51) e com o perfil é feita por quem
 * usa o arquivo, pela interface publicada na raiz. RF49 (link externo) não é deste módulo.</p>
 *
 * <p>Interface publicada (raiz): {@link FinalidadeArquivo}, {@link ArquivoAnexado},
 * {@link MidiaConsulta} (resolver ids em URL assinada) e {@link MidiaAssociacao} (reivindicar e
 * liberar; reivindicar usa lock pessimista na linha).</p>
 */
package br.edu.unicatolica.pacext.midia;
