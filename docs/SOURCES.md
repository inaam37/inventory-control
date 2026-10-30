# Source evidence — October 30, 2026

## Public menu

The official [Farmhouse website](https://www.farmhouseon10th.com/) linked these PDFs through its live JavaScript asset `main.9a2b4166.js`. Downloaded menu bytes were extracted with `pdftotext -layout`; names and CAD prices were manually transcribed into `farmhouse-menu.js`. 110 entries include separately priced sizes, services, sides and add-ons. Descriptions and recipe quantities were not copied or inferred. PDFs can change without a URL change; fingerprints identify the versions checked.

| Menu | Official source | Download SHA-256 |
| --- | --- | --- |
| main | [PDF](https://www.farmhouseon10th.com/assets/menus/the_farmhouse_Main_Menu.pdf) | `f526548024ebfe2fa68fe1dbc8b9a0cc7f6012c6a1cc1b344d3b2cd244ce60dc` |
| lunch | [PDF](https://www.farmhouseon10th.com/assets/menus/the_farmhouse_Lunch_Menu.pdf) | `4129548f98a4045c9af70ff8f64d9ccc8e5af7e4b36ea52de123979b4e155fdc` |
| brunch | [PDF](https://www.farmhouseon10th.com/assets/menus/the_farmhouse_Brunch.pdf) | `fe12d71dec87d84ac8d312a45168d82f6e5906109ccd02e053aba4bc80c265e4` |
| happy_hour | [PDF](https://www.farmhouseon10th.com/assets/menus/the_farmhouse_Happy_Hour.pdf) | `b0f33a190badadf7e700b8070faf7e581f91ac153daba2b5a43bb60dd69621e0` |
| dessert | [PDF](https://www.farmhouseon10th.com/assets/menus/the_farmhouse%20_Dessert.pdf) | `ee37e1cadbbe485938674f8f76f3a8603e649d7e6f6935c4b91759098bd133a3` |
| beverages | [PDF](https://www.farmhouseon10th.com/assets/menus/the_farmhouse_Beverages.pdf) | `715e05091c8bea557d10ab5d9c447d811cb57798eaf12f9b62aa326947f775eb` |

Wine lists, group/event packages, prix-fixe specials and Mangia Wednesdays were discovered as additional links but have not been costed or loaded. A manager must verify those separately, and confirm active dishes and current website prices before trading on them. Meal/bundle choices are left uncosted until a real recipe exists. Last checked is not a claimed publication date.

## Supplier pricing

The official [GFS Canada site](https://gfs.ca/en-ca/) links [Gordon Ordering](https://gfs.ca/products-services/technology-solutions/gordon-ordering/). The official [Sysco Canada site](https://www.sysco.ca/) links [Sysco Shop login](https://shop.sysco.ca/auth/login).

No authenticated supplier account prices were retrieved. A targeted search of available supplier correspondence found conference material rather than a usable current invoice/price list; none was converted into pricing or committed. No claim that one supplier is cheaper is supported yet. No credentials, customer account numbers, negotiated prices or private attachments are included in the repository.

The app is ready to compare **user-imported, source-dated CAD quotes** for matched products. It normalizes pack net content to stock units, marks quotes over 30 days old and retains supplier/SKU/source/specification. It does not infer density, freight, taxes, rebates, market prices or contract prices. Use an authorized invoice/portal export to complete the comparison privately in the browser.

## Third-party browser library

DOMPurify is vendored from the installed locked npm package; its license is in `vendor/DOMPurify-LICENSE.txt`. It is the only third-party browser script. Production browser requests are local static assets only.
