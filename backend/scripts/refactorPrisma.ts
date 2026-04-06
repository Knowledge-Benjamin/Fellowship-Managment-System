import { Project, SyntaxKind, FunctionDeclaration, ArrowFunction, VariableDeclaration } from 'ts-morph';

const project = new Project();
project.addSourceFilesAtPaths("src/controllers/**/*.ts");

const files = project.getSourceFiles();

for (const file of files) {
    let replacedPrisma = false;

    // 1. Remove static prisma import
    const importDecls = file.getImportDeclarations();
    for (const imp of importDecls) {
        if (imp.getModuleSpecifierValue().includes('prisma')) {
            const defaultImport = imp.getDefaultImport();
            if (defaultImport && defaultImport.getText() === 'prisma') {
                imp.remove();
            }
        }
    }

    // 2. Add PrismaClient import if not exists
    const currentImports = file.getImportDeclarations();
    const hasPrismaClientImport = currentImports.some(imp => 
        imp.getModuleSpecifierValue() === '@prisma/client' && 
        imp.getNamedImports().some(ni => ni.getName() === 'PrismaClient')
    );

    if (!hasPrismaClientImport) {
        file.addImportDeclaration({
            moduleSpecifier: '@prisma/client',
            namedImports: ['PrismaClient']
        });
    }

    // 3. Inject into all route handlers
    const injectPrisma = (body: any) => {
        if (body && body.getKind() === SyntaxKind.Block) {
            // Check if it already has it
            const text = body.getText();
            if (!text.includes('const prisma =')) {
                body.insertStatements(0, 'const prisma = (req as any).prisma as PrismaClient;');
            }
        }
    };

    // Handle standard explicitly exported functions
    for (const func of file.getFunctions()) {
        if (func.isExported()) {
            injectPrisma(func.getBody());
        }
    }

    for (const varDecl of file.getVariableDeclarations()) {
        const initializer = varDecl.getInitializer();
        let targetBody: any = null;

        if (initializer) {
            if (initializer.getKind() === SyntaxKind.ArrowFunction || initializer.getKind() === SyntaxKind.FunctionExpression) {
                targetBody = (initializer as ArrowFunction).getBody();
            } else if (initializer.getKind() === SyntaxKind.CallExpression) {
                // e.g. asyncHandler(async (req, res) => { ... })
                const args = (initializer as any).getArguments();
                if (args && args.length > 0) {
                    const firstArg = args[0];
                    if (firstArg.getKind() === SyntaxKind.ArrowFunction || firstArg.getKind() === SyntaxKind.FunctionExpression) {
                        targetBody = firstArg.getBody();
                    }
                }
            }
        }

        if (targetBody) {
            // Ensure this is an exported controller function
            const parent = varDecl.getParent()?.getParent(); // VariableStatement
            if (parent && parent.getKind() === SyntaxKind.VariableStatement) {
                // To safely check if it has export keyword:
                const hasExport = (parent as any).getModifiers().some((m: any) => m.getKind() === SyntaxKind.ExportKeyword);
                if (hasExport) {
                    injectPrisma(targetBody);
                }
            }
        }
    }

    file.saveSync();
    console.log(`Refactored ${file.getBaseName()}`);
}

console.log("Refactoring complete.");
