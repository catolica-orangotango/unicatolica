package br.edu.unicatolica.pacext.midia.dominio;

/** Formatos aceitos pelo módulo (RF50). O tipo é sempre o detectado pelo conteúdo. */
public enum TipoArquivo {
    PNG("image/png"),
    JPEG("image/jpeg"),
    PDF("application/pdf");

    private final String mime;

    TipoArquivo(String mime) {
        this.mime = mime;
    }

    public String mime() {
        return mime;
    }

    public boolean imagem() {
        return this == PNG || this == JPEG;
    }
}
