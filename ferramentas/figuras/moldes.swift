/*
   moldes — converte os desenhos SVG dos exercícios em PNG, para servirem
   de molde ao ControlNet.

   Os nossos SVG são um traçado branco sobre fundo transparente. O ControlNet
   lineart quer o contrário: traço preto sobre branco. Por isso desenhamos
   sobre branco e invertemos.

   Usa o WebKit, que já vem no macOS — assim não é preciso instalar
   rasterizadores nem dependências.

   uso:  moldes <pasta-exercicios> <pasta-destino> <lado-em-px>
*/

import AppKit
import WebKit

let args = CommandLine.arguments
guard args.count >= 4, let lado = Int(args[3]) else {
    print("uso: moldes <pasta-exercicios> <pasta-destino> <lado>")
    exit(1)
}
let origem = URL(fileURLWithPath: args[1])
let destino = URL(fileURLWithPath: args[2])
let fm = FileManager.default

/// Todos os frame-N.svg, agrupados por exercício.
func trabalhos() -> [(slug: String, ficheiro: URL)] {
    var fora: [(String, URL)] = []
    let pastas = (try? fm.contentsOfDirectory(at: origem, includingPropertiesForKeys: nil)) ?? []
    for pasta in pastas.sorted(by: { $0.lastPathComponent < $1.lastPathComponent }) {
        var eDir: ObjCBool = false
        guard fm.fileExists(atPath: pasta.path, isDirectory: &eDir), eDir.boolValue else { continue }
        let svgs = ((try? fm.contentsOfDirectory(at: pasta, includingPropertiesForKeys: nil)) ?? [])
            .filter { $0.pathExtension == "svg" }
            .sorted { $0.lastPathComponent < $1.lastPathComponent }
        for s in svgs { fora.append((pasta.lastPathComponent, s)) }
    }
    return fora
}

let lista = trabalhos()
print("encontrei \(lista.count) desenhos em \(Set(lista.map { $0.slug }).count) exercícios")

let app = NSApplication.shared
app.setActivationPolicy(.accessory)

let config = WKWebViewConfiguration()
let vista = WKWebView(frame: NSRect(x: 0, y: 0, width: lado, height: lado), configuration: config)
let janela = NSWindow(contentRect: vista.frame, styleMask: [.borderless], backing: .buffered, defer: false)
janela.contentView = vista
janela.orderBack(nil)

final class Espera: NSObject, WKNavigationDelegate {
    var pronto: (() -> Void)?
    func webView(_ w: WKWebView, didFinish n: WKNavigation!) { pronto?() }
}
let espera = Espera()
vista.navigationDelegate = espera

/// Recorta à volta do desenho e devolve um quadrado do tamanho pedido.
/// Sem isto o boneco fica pequeno no meio de um mar de branco, e o modelo
/// recebe quase só fundo.
func enquadrar(_ cg: CGImage, lado: Int) -> CGImage? {
    let L = cg.width, A = cg.height
    guard let ctx = CGContext(data: nil, width: L, height: A, bitsPerComponent: 8,
                              bytesPerRow: L * 4, space: CGColorSpaceCreateDeviceRGB(),
                              bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue),
          let _ = { ctx.draw(cg, in: CGRect(x: 0, y: 0, width: L, height: A)); return ctx.data }()
    else { return nil }
    let px = ctx.data!.bindMemory(to: UInt8.self, capacity: L * A * 4)

    var minX = L, minY = A, maxX = 0, maxY = 0
    for y in 0..<A {
        for x in 0..<L {
            let i = (y * L + x) * 4
            // tudo o que não é quase-branco conta como desenho
            if Int(px[i]) < 200 || Int(px[i + 1]) < 200 || Int(px[i + 2]) < 200 {
                if x < minX { minX = x }; if x > maxX { maxX = x }
                if y < minY { minY = y }; if y > maxY { maxY = y }
            }
        }
    }
    guard maxX > minX, maxY > minY else { return nil }

    // quadrado centrado no desenho, com uma margem de 7%
    let largura = maxX - minX, altura = maxY - minY
    let aresta = Int(Double(max(largura, altura)) * 1.14)
    let cx = (minX + maxX) / 2, cy = (minY + maxY) / 2
    let x0 = cx - aresta / 2, y0 = cy - aresta / 2

    guard let fora = CGContext(data: nil, width: lado, height: lado, bitsPerComponent: 8,
                               bytesPerRow: lado * 4, space: CGColorSpaceCreateDeviceRGB(),
                               bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)
    else { return nil }
    fora.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1))
    fora.fill(CGRect(x: 0, y: 0, width: lado, height: lado))
    fora.interpolationQuality = .high
    let escala = Double(lado) / Double(aresta)
    fora.draw(cg, in: CGRect(x: -Double(x0) * escala, y: -Double(y0) * escala,
                             width: Double(L) * escala, height: Double(A) * escala))
    return fora.makeImage()
}

var feitos = 0, falhados = 0
var i = 0

func seguinte() {
    guard i < lista.count else {
        print("\nprontos: \(feitos)   falhados: \(falhados)")
        exit(falhados > 0 ? 2 : 0)
    }
    let (slug, ficheiro) = lista[i]
    i += 1

    let saidaDir = destino.appendingPathComponent(slug)
    try? fm.createDirectory(at: saidaDir, withIntermediateDirectories: true)
    let saida = saidaDir.appendingPathComponent(
        ficheiro.deletingPathExtension().lastPathComponent + ".png")

    guard let svg = try? Data(contentsOf: ficheiro) else { falhados += 1; return seguinte() }
    let b64 = svg.base64EncodedString()

    // fundo branco e inversão: o traço branco do SVG fica preto
    let html = """
    <html><head><meta charset="utf-8"><style>
      html,body{margin:0;padding:0;background:#fff;width:\(lado)px;height:\(lado)px}
      img{width:\(lado)px;height:\(lado)px;display:block;filter:invert(1)}
    </style></head><body>
      <img src="data:image/svg+xml;base64,\(b64)">
    </body></html>
    """

    espera.pronto = {
        // uma volta do runloop para o WebKit acabar de pintar
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
            vista.takeSnapshot(with: nil) { imagem, _ in
                defer { seguinte() }
                guard let imagem,
                      let cg = imagem.cgImage(forProposedRect: nil, context: nil, hints: nil),
                      let recortada = enquadrar(cg, lado: lado),
                      let png = NSBitmapImageRep(cgImage: recortada)
                        .representation(using: .png, properties: [:])
                else { falhados += 1; return }
                try? png.write(to: saida)
                feitos += 1
                if feitos % 50 == 0 { print("  \(feitos)/\(lista.count)…") }
            }
        }
    }
    vista.loadHTMLString(html, baseURL: nil)
}

DispatchQueue.main.async { seguinte() }
app.run()
